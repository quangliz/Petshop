"""Build a compact LangSmith observability report for the agent eval run.

Usage:
    uv run python scripts/report_langsmith_metrics.py
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from statistics import mean, median
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from langsmith import Client  # noqa: E402
from langsmith.utils import LangSmithRateLimitError  # noqa: E402

from app.core.config import settings  # noqa: E402


EVAL_PROJECT = "thepawsome-eval"
JUDGE_PROJECT = "thepawsome-judge"
DEFAULT_OUTPUT = Path(__file__).resolve().parent.parent.parent / "docs" / "ai-langsmith-metrics.md"
DEFAULT_JSON_OUTPUT = Path(__file__).resolve().parent.parent.parent / "docs" / "ai-langsmith-metrics.json"
CASE_TAG_RE = re.compile(r"^case:(\d+)$")
GROUP_TAG_RE = re.compile(r"^group:(.+)$")


@dataclass(frozen=True)
class CaseTrace:
    case_id: int
    group: str
    expected_tools: tuple[str, ...]
    actual_tools: tuple[str, ...]
    handoff_expected: bool
    safety_expected: bool
    safety_actual: bool
    latency_seconds: float | None
    total_tokens: int
    total_cost: float
    error: bool
    run_id: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--eval-project", default=EVAL_PROJECT)
    parser.add_argument("--judge-project", default=JUDGE_PROJECT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--json-output", type=Path, default=DEFAULT_JSON_OUTPUT)
    return parser.parse_args()


def as_float(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def as_seconds(value: Any) -> float | None:
    if value is None:
        return None
    if hasattr(value, "total_seconds"):
        return float(value.total_seconds())
    return float(value)


def pct(values: list[float], percentile: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * percentile
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def round_or_none(value: float | None, digits: int = 3) -> float | None:
    if value is None:
        return None
    return round(value, digits)


def run_metadata(run: Any) -> dict[str, Any]:
    return (run.extra or {}).get("metadata", {}) or {}


def tag_value(tags: list[str] | None, pattern: re.Pattern[str]) -> str | None:
    for tag in tags or []:
        match = pattern.match(tag)
        if match:
            return match.group(1)
    return None


def case_id_for(run: Any) -> int:
    metadata = run_metadata(run)
    value = metadata.get("eval_case_id") or tag_value(run.tags, CASE_TAG_RE)
    if value is None:
        raise ValueError(f"Run {run.id} thiếu eval_case_id/case tag")
    return int(value)


def group_for(run: Any) -> str:
    metadata = run_metadata(run)
    return str(metadata.get("eval_group") or tag_value(run.tags, GROUP_TAG_RE) or "unknown")


def expected_trace_for(run: Any) -> dict[str, Any]:
    return run_metadata(run).get("expected_trace") or {}


def extract_agent_tools_and_safety(outputs: dict[str, Any] | None) -> tuple[list[str], bool]:
    if not outputs:
        return [], False
    trace = outputs.get("trace")
    if isinstance(trace, list):
        tools = [item.get("tool") for item in trace if item.get("event") == "tool_call"]
        safety = any(item.get("event") == "safety_preflight" for item in trace)
        return [tool for tool in tools if tool], safety

    messages = outputs.get("messages") or []
    tools: list[str] = []
    for message in messages:
        for tool_call in message.get("tool_calls") or []:
            name = tool_call.get("name")
            if name:
                tools.append(name)
    return tools, False


def is_subsequence(expected: tuple[str, ...], actual: tuple[str, ...]) -> bool:
    if not expected:
        return True
    cursor = 0
    for tool in actual:
        if tool == expected[cursor]:
            cursor += 1
            if cursor == len(expected):
                return True
    return False


def extract_case_trace(run: Any) -> CaseTrace:
    expected_trace = expected_trace_for(run)
    actual_tools, safety_actual = extract_agent_tools_and_safety(run.outputs)
    return CaseTrace(
        case_id=case_id_for(run),
        group=group_for(run),
        expected_tools=tuple(expected_trace.get("required_tools", [])),
        actual_tools=tuple(actual_tools),
        handoff_expected=bool(expected_trace.get("handoff", False)),
        safety_expected=bool(expected_trace.get("safety_preflight", False)),
        safety_actual=safety_actual,
        latency_seconds=as_seconds(getattr(run, "latency", None)),
        total_tokens=int(getattr(run, "total_tokens", 0) or 0),
        total_cost=as_float(getattr(run, "total_cost", 0) or 0),
        error=bool(getattr(run, "error", None)),
        run_id=str(run.id),
    )


def judge_score_for(run: Any) -> dict[str, Any]:
    output = (run.outputs or {}).get("output") or {}
    return {
        "case_id": case_id_for(run),
        "group": group_for(run),
        "relevance": output.get("relevance"),
        "groundedness": output.get("groundedness"),
        "helpfulness": output.get("helpfulness"),
        "safety": output.get("safety"),
        "average": round(mean([
            output.get("relevance", 0),
            output.get("groundedness", 0),
            output.get("helpfulness", 0),
            output.get("safety", 0),
        ]), 2),
        "run_id": str(run.id),
    }


def list_runs_with_retry(client: Client, *, project_name: str, is_root: bool | None = None) -> list[Any]:
    kwargs: dict[str, Any] = {"project_name": project_name}
    if is_root is not None:
        kwargs["is_root"] = is_root
    for attempt in range(4):
        try:
            return list(client.list_runs(**kwargs))
        except LangSmithRateLimitError:
            if attempt == 3:
                raise
            time.sleep(15 * (attempt + 1))
    return []


def token_detail_value(run: Any, key: str) -> int:
    details = getattr(run, "prompt_token_details", None) or {}
    if isinstance(details, dict):
        return int(details.get(key, 0) or 0)
    return 0


def project_stats_from_roots(runs: list[Any]) -> dict[str, Any]:
    latencies = [as_seconds(getattr(run, "latency", None)) for run in runs]
    latencies = [latency for latency in latencies if latency is not None]
    last_start = max((run.start_time for run in runs if getattr(run, "start_time", None)), default=None)
    error_count = sum(bool(getattr(run, "error", None)) for run in runs)
    return {
        "run_count": len(runs),
        "latency_p50_seconds": round_or_none(median(latencies) if latencies else None),
        "latency_p99_seconds": round_or_none(pct(latencies, 0.99)),
        "error_rate": round(100 * error_count / len(runs), 1) if runs else 0,
        "total_tokens": sum(int(getattr(run, "total_tokens", 0) or 0) for run in runs),
        "prompt_tokens": sum(int(getattr(run, "prompt_tokens", 0) or 0) for run in runs),
        "completion_tokens": sum(int(getattr(run, "completion_tokens", 0) or 0) for run in runs),
        "total_cost_usd": round(sum(as_float(getattr(run, "total_cost", 0) or 0) for run in runs), 6),
        "prompt_cost_usd": round(sum(as_float(getattr(run, "prompt_cost", 0) or 0) for run in runs), 6),
        "completion_cost_usd": round(sum(as_float(getattr(run, "completion_cost", 0) or 0) for run in runs), 6),
        "cache_read_tokens": sum(token_detail_value(run, "cache_read") for run in runs),
        "last_run_start_time": last_start.isoformat() if last_start else None,
    }


def summarize_latencies(values: list[float]) -> dict[str, float | None]:
    return {
        "min": round_or_none(min(values) if values else None),
        "p50": round_or_none(median(values) if values else None),
        "p90": round_or_none(pct(values, 0.90)),
        "p95": round_or_none(pct(values, 0.95)),
        "p99": round_or_none(pct(values, 0.99)),
        "max": round_or_none(max(values) if values else None),
    }


def summarize_tool_runs(runs: list[Any]) -> list[dict[str, Any]]:
    by_tool: dict[str, list[Any]] = defaultdict(list)
    for run in runs:
        if run.run_type == "tool":
            by_tool[run.name].append(run)

    rows = []
    for name, tool_runs in sorted(by_tool.items()):
        latencies = [as_seconds(run.latency) for run in tool_runs if as_seconds(run.latency) is not None]
        errors = sum(bool(run.error) for run in tool_runs)
        rows.append({
            "tool": name,
            "calls": len(tool_runs),
            "errors": errors,
            "error_rate": round(100 * errors / len(tool_runs), 1) if tool_runs else 0.0,
            "latency_seconds": summarize_latencies([latency for latency in latencies if latency is not None]),
        })
    return rows


def summarize_trace_contract(cases: list[CaseTrace]) -> dict[str, Any]:
    required_hits = []
    order_hits = []
    handoff_expected = []
    handoff_prevented = []
    safety_hits = []
    unexpected_safety = []

    group_counts: dict[str, Counter[str]] = defaultdict(Counter)
    tool_counts = Counter()
    tool_calls_per_case = []

    for case in cases:
        required_ok = all(tool in case.actual_tools for tool in case.expected_tools)
        order_ok = is_subsequence(case.expected_tools, case.actual_tools)
        actual_handoff = "request_human_support_tool" in case.actual_tools

        required_hits.append(required_ok)
        order_hits.append(order_ok)
        if case.handoff_expected:
            handoff_expected.append(actual_handoff)
        else:
            handoff_prevented.append(not actual_handoff)
        if case.safety_expected:
            safety_hits.append(case.safety_actual)
        else:
            unexpected_safety.append(not case.safety_actual)

        for tool in case.actual_tools:
            tool_counts[tool] += 1
        tool_calls_per_case.append(len(case.actual_tools))

        group_counts[case.group]["cases"] += 1
        group_counts[case.group]["required_ok"] += int(required_ok)
        group_counts[case.group]["order_ok"] += int(order_ok)
        group_counts[case.group]["handoff_ok"] += int(
            actual_handoff if case.handoff_expected else not actual_handoff
        )
        group_counts[case.group]["safety_ok"] += int(
            case.safety_actual if case.safety_expected else not case.safety_actual
        )

    def rate(values: list[bool]) -> float | None:
        return round(100 * sum(values) / len(values), 1) if values else None

    return {
        "required_tool_hit_rate": rate(required_hits),
        "tool_order_rate": rate(order_hits),
        "handoff_hit_rate": rate(handoff_expected),
        "unexpected_handoff_absence_rate": rate(handoff_prevented),
        "safety_preflight_hit_rate": rate(safety_hits),
        "unexpected_safety_absence_rate": rate(unexpected_safety),
        "avg_tool_calls_per_case": round(mean(tool_calls_per_case), 2) if tool_calls_per_case else 0,
        "tool_call_counts": dict(sorted(tool_counts.items())),
        "groups": [
            {
                "group": group,
                "cases": counts["cases"],
                "required_tool_hit_rate": round(100 * counts["required_ok"] / counts["cases"], 1),
                "tool_order_rate": round(100 * counts["order_ok"] / counts["cases"], 1),
                "handoff_accuracy": round(100 * counts["handoff_ok"] / counts["cases"], 1),
                "safety_accuracy": round(100 * counts["safety_ok"] / counts["cases"], 1),
            }
            for group, counts in sorted(group_counts.items())
        ],
    }


def summarize_judge(scores: list[dict[str, Any]]) -> dict[str, Any]:
    dimensions = ("relevance", "groundedness", "helpfulness", "safety", "average")
    by_group: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for score in scores:
        by_group[score["group"]].append(score)

    summary = {
        dimension: round(mean(score[dimension] for score in scores), 2) if scores else 0
        for dimension in dimensions
    }
    summary["cases_below_4_average"] = [
        score["case_id"] for score in sorted(scores, key=lambda item: item["case_id"]) if score["average"] < 4
    ]
    summary["groups"] = [
        {
            "group": group,
            "cases": len(group_scores),
            **{
                dimension: round(mean(score[dimension] for score in group_scores), 2)
                for dimension in dimensions
            },
        }
        for group, group_scores in sorted(by_group.items())
    ]
    return summary


def summarize_root_runs(cases: list[CaseTrace]) -> dict[str, Any]:
    latencies = [case.latency_seconds for case in cases if case.latency_seconds is not None]
    return {
        "run_count": len(cases),
        "error_count": sum(case.error for case in cases),
        "error_rate": round(100 * sum(case.error for case in cases) / len(cases), 1) if cases else 0,
        "latency_seconds": summarize_latencies([latency for latency in latencies if latency is not None]),
        "total_tokens": sum(case.total_tokens for case in cases),
        "avg_tokens_per_case": round(mean(case.total_tokens for case in cases), 1) if cases else 0,
        "total_cost_usd": round(sum(case.total_cost for case in cases), 6),
        "avg_cost_usd": round(mean(case.total_cost for case in cases), 6) if cases else 0,
    }


def assert_project_isolation(eval_roots: list[Any], judge_roots: list[Any]) -> dict[str, Any]:
    eval_root_names = sorted({run.name for run in eval_roots})
    judge_root_names = sorted({run.name for run in judge_roots})
    return {
        "eval_root_names": eval_root_names,
        "judge_root_names": judge_root_names,
        "ok": eval_root_names == ["agent_eval_case"] and judge_root_names == ["agent_eval_judge"],
    }


def build_report(metrics: dict[str, Any]) -> str:
    eval_root = metrics["eval_root_summary"]
    judge_root = metrics["judge_root_summary"]
    trace = metrics["trace_contract"]
    judge = metrics["judge_scores"]
    project = metrics["project_stats"]

    lines = [
        "# LangSmith Eval Metrics - ThePawsome",
        "",
        f"Generated: {metrics['generated_at']}",
        f"Projects: `{metrics['eval_project']}` for agent traces, `{metrics['judge_project']}` for LLM-as-judge traces.",
        "",
        "## Useful LangSmith Metrics",
        "",
        "| Metric | Value | Why it matters |",
        "|---|---:|---|",
        f"| Eval root runs | {eval_root['run_count']} | Phải khớp số eval cases. |",
        f"| Judge root runs | {judge_root['run_count']} | Phải tách khỏi agent traces để không lẫn latency/cost. |",
        f"| Eval error rate | {eval_root['error_rate']}% | Run health của agent eval. |",
        f"| Judge error rate | {judge_root['error_rate']}% | Run health của judge pipeline. |",
        f"| Agent latency p50 / p95 / p99 | {eval_root['latency_seconds']['p50']}s / {eval_root['latency_seconds']['p95']}s / {eval_root['latency_seconds']['p99']}s | Golden signal latency cho agent. |",
        f"| Judge latency p50 / p95 / p99 | {judge_root['latency_seconds']['p50']}s / {judge_root['latency_seconds']['p95']}s / {judge_root['latency_seconds']['p99']}s | Chi phí thời gian của LLM-as-judge. |",
        f"| Agent tokens / cost | {eval_root['total_tokens']:,} / ${eval_root['total_cost_usd']} | Token/cost budget của agent. |",
        f"| Judge tokens / cost | {judge_root['total_tokens']:,} / ${judge_root['total_cost_usd']} | Judge thường tốn hơn agent, cần theo dõi riêng. |",
        f"| Required-tool hit rate | {trace['required_tool_hit_rate']}% | Agent có gọi đúng tool bắt buộc không. |",
        f"| Tool-order rate | {trace['tool_order_rate']}% | Luồng nhiều tool có đúng thứ tự không. |",
        f"| HITL handoff hit rate | {trace['handoff_hit_rate']}% | Case cần người thật có chuyển giao không. |",
        f"| Unexpected handoff absence | {trace['unexpected_handoff_absence_rate']}% | Case bình thường có tránh chuyển người thật không. |",
        f"| Safety preflight hit rate | {trace['safety_preflight_hit_rate']}% | Guardrail preflight có chặn đúng case không. |",
        f"| Avg tool calls / case | {trace['avg_tool_calls_per_case']} | Dấu hiệu agent over/under-tooling. |",
        f"| Judge average | {judge['average']} / 5 | Chất lượng câu trả lời theo LLM-as-judge. |",
        f"| Judge groundedness | {judge['groundedness']} / 5 | Độ bám evidence/trace. |",
        f"| Judge safety | {judge['safety']} / 5 | An toàn y tế, secret, handoff. |",
        "",
        "## Project Health",
        "",
        "| Project | Runs | P50 | P99 | Error | Tokens | Cost | Cache Read |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
        f"| {metrics['eval_project']} | {project['eval']['run_count']} | {project['eval']['latency_p50_seconds']}s | {project['eval']['latency_p99_seconds']}s | {project['eval']['error_rate']} | {project['eval']['total_tokens']:,} | ${project['eval']['total_cost_usd']} | {project['eval']['cache_read_tokens']:,} |",
        f"| {metrics['judge_project']} | {project['judge']['run_count']} | {project['judge']['latency_p50_seconds']}s | {project['judge']['latency_p99_seconds']}s | {project['judge']['error_rate']} | {project['judge']['total_tokens']:,} | ${project['judge']['total_cost_usd']} | {project['judge']['cache_read_tokens']:,} |",
        "",
        "## Tool Calls",
        "",
        "| Tool | Calls | Errors | P50 Latency | P95 Latency | Max Latency |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for row in metrics["tool_runs"]:
        latency = row["latency_seconds"]
        lines.append(
            f"| {row['tool']} | {row['calls']} | {row['errors']} | "
            f"{latency['p50']}s | {latency['p95']}s | {latency['max']}s |"
        )

    lines.extend([
        "",
        "## Trace Contract By Group",
        "",
        "| Group | Cases | Required Tool | Tool Order | Handoff Accuracy | Safety Accuracy |",
        "|---|---:|---:|---:|---:|---:|",
    ])
    for row in trace["groups"]:
        lines.append(
            f"| {row['group']} | {row['cases']} | {row['required_tool_hit_rate']}% | "
            f"{row['tool_order_rate']}% | {row['handoff_accuracy']}% | {row['safety_accuracy']}% |"
        )

    lines.extend([
        "",
        "## Judge Scores By Group",
        "",
        "| Group | Cases | Avg | Relevance | Groundedness | Helpfulness | Safety |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ])
    for row in judge["groups"]:
        lines.append(
            f"| {row['group']} | {row['cases']} | {row['average']} | {row['relevance']} | "
            f"{row['groundedness']} | {row['helpfulness']} | {row['safety']} |"
        )

    lines.extend([
        "",
        "## Notes",
        "",
        f"- Project isolation: {'OK' if metrics['project_isolation']['ok'] else 'CHECK'} "
        f"(eval roots: {', '.join(metrics['project_isolation']['eval_root_names'])}; "
        f"judge roots: {', '.join(metrics['project_isolation']['judge_root_names'])}).",
        f"- Tool call counts from agent traces: {json.dumps(trace['tool_call_counts'], ensure_ascii=False)}.",
    ])
    if judge["cases_below_4_average"]:
        lines.append(f"- Judge average below 4/5: cases {judge['cases_below_4_average']}.")
    else:
        lines.append("- Judge average below 4/5: none.")
    lines.append("- Raw aggregate metrics are stored in `docs/ai-langsmith-metrics.json`.")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    if not settings.LANGSMITH_API_KEY:
        raise SystemExit("LANGSMITH_API_KEY is not configured")

    client = Client(api_key=settings.LANGSMITH_API_KEY, api_url=settings.LANGSMITH_ENDPOINT)
    eval_roots = list_runs_with_retry(client, project_name=args.eval_project, is_root=True)
    judge_roots = list_runs_with_retry(client, project_name=args.judge_project, is_root=True)
    eval_runs = list_runs_with_retry(client, project_name=args.eval_project)

    case_traces = sorted((extract_case_trace(run) for run in eval_roots), key=lambda item: item.case_id)
    judge_scores = sorted((judge_score_for(run) for run in judge_roots), key=lambda item: item["case_id"])

    metrics = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "eval_project": args.eval_project,
        "judge_project": args.judge_project,
        "project_stats": {
            "eval": project_stats_from_roots(eval_roots),
            "judge": project_stats_from_roots(judge_roots),
        },
        "project_isolation": assert_project_isolation(eval_roots, judge_roots),
        "eval_root_summary": summarize_root_runs(case_traces),
        "judge_root_summary": summarize_root_runs([
            CaseTrace(
                case_id=case_id_for(run),
                group=group_for(run),
                expected_tools=(),
                actual_tools=(),
                handoff_expected=False,
                safety_expected=False,
                safety_actual=False,
                latency_seconds=as_seconds(getattr(run, "latency", None)),
                total_tokens=int(getattr(run, "total_tokens", 0) or 0),
                total_cost=as_float(getattr(run, "total_cost", 0) or 0),
                error=bool(getattr(run, "error", None)),
                run_id=str(run.id),
            )
            for run in judge_roots
        ]),
        "trace_contract": summarize_trace_contract(case_traces),
        "judge_scores": summarize_judge(judge_scores),
        "tool_runs": summarize_tool_runs(eval_runs),
        "case_run_ids": {
            str(case.case_id): {
                "eval_run_id": case.run_id,
                "judge_run_id": next(
                    (score["run_id"] for score in judge_scores if score["case_id"] == case.case_id),
                    None,
                ),
            }
            for case in case_traces
        },
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.json_output.parent.mkdir(parents=True, exist_ok=True)
    args.json_output.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    args.output.write_text(build_report(metrics), encoding="utf-8")
    print(f"Report: {args.output}", flush=True)
    print(f"Evidence: {args.json_output}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
