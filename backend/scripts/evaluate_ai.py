"""
AI Evaluation Script — Compare RAG vs No-RAG chatbot quality.

Usage:
    cd backend
    uv run python scripts/evaluate_ai.py

Outputs: docs/ai-evaluation.md
"""

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.database import SessionLocal
from app.services.chat_agent import build_agent, build_system_prompt

QUESTIONS_FILE = Path(__file__).parent / "eval_questions.json"
OUTPUT_FILE = Path(__file__).resolve().parent.parent.parent / "docs" / "ai-evaluation.md"

JUDGE_MODEL = "gpt-4o"
JUDGE_PROMPT = """\
Bạn là chuyên gia đánh giá chatbot chăm sóc thú cưng. Chấm điểm câu trả lời trên 3 chiều (1-5):
- **Relevance**: Câu trả lời có đúng trọng tâm câu hỏi không?
- **Groundedness**: Thông tin có thực tế, có dẫn chứng cụ thể, ít bịa đặt không?
- **Helpfulness**: Câu trả lời có hữu ích, thực tế, giúp người dùng hành động không?

Trả về JSON duy nhất, không giải thích thêm:
{"relevance": <int>, "groundedness": <int>, "helpfulness": <int>, "reasoning": "<1 câu ngắn>"}
"""


async def run_rag(question: str, db) -> str:
    agent = build_agent(db)
    system_prompt = build_system_prompt()
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=question)]
    result = await agent.ainvoke({"messages": messages})
    for msg in reversed(result["messages"]):
        if hasattr(msg, "content") and msg.content and msg.type == "ai":
            return msg.content
    return "(no response)"


async def run_no_rag(question: str) -> str:
    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.3,
    )
    system_prompt = (
        "Bạn là trợ lý AI chuyên gia dinh dưỡng và y tế thú cưng của ThePawsome. "
        "Trả lời bằng tiếng Việt, ngắn gọn, hữu ích."
    )
    result = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=question),
    ])
    return result.content


async def judge(question: str, response: str) -> dict:
    llm = ChatOpenAI(
        model=JUDGE_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0,
    )
    prompt = f"Câu hỏi: {question}\n\nCâu trả lời:\n{response}"
    result = await llm.ainvoke([
        SystemMessage(content=JUDGE_PROMPT),
        HumanMessage(content=prompt),
    ])
    try:
        return json.loads(result.content)
    except json.JSONDecodeError:
        return {"relevance": 0, "groundedness": 0, "helpfulness": 0, "reasoning": "parse error"}


def avg(scores: list[dict], key: str) -> float:
    vals = [s[key] for s in scores if s.get(key)]
    return round(sum(vals) / len(vals), 2) if vals else 0


def generate_report(results: list[dict]) -> str:
    lines = [
        "# AI Evaluation Report",
        f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"\nModel: `{settings.CHAT_MODEL}` | Judge: `{JUDGE_MODEL}`",
        "",
    ]

    rag_scores = [r["rag_score"] for r in results]
    no_rag_scores = [r["no_rag_score"] for r in results]

    lines.append("## Summary\n")
    lines.append("| Mode | Relevance | Groundedness | Helpfulness | Average |")
    lines.append("|------|-----------|--------------|-------------|---------|")
    for label, scores in [("RAG", rag_scores), ("No-RAG", no_rag_scores)]:
        r, g, h = avg(scores, "relevance"), avg(scores, "groundedness"), avg(scores, "helpfulness")
        a = round((r + g + h) / 3, 2)
        lines.append(f"| {label} | {r} | {g} | {h} | {a} |")

    for group in ["nutrition", "health", "product"]:
        group_results = [r for r in results if r["group"] == group]
        group_label = {"nutrition": "Dinh dưỡng", "health": "Sức khỏe", "product": "Gợi ý sản phẩm"}[group]
        lines.append(f"\n## {group_label}\n")
        lines.append("| # | Câu hỏi | RAG (R/G/H) | No-RAG (R/G/H) | Delta |")
        lines.append("|---|---------|-------------|----------------|-------|")
        for r in group_results:
            rs = r["rag_score"]
            ns = r["no_rag_score"]
            rag_avg = round((rs["relevance"] + rs["groundedness"] + rs["helpfulness"]) / 3, 1)
            no_rag_avg = round((ns["relevance"] + ns["groundedness"] + ns["helpfulness"]) / 3, 1)
            delta = round(rag_avg - no_rag_avg, 1)
            delta_str = f"+{delta}" if delta > 0 else str(delta)
            lines.append(
                f"| {r['id']} | {r['question'][:40]} | "
                f"{rs['relevance']}/{rs['groundedness']}/{rs['helpfulness']} | "
                f"{ns['relevance']}/{ns['groundedness']}/{ns['helpfulness']} | "
                f"{delta_str} |"
            )

    lines.append("\n## Per-Question Details\n")
    for r in results:
        lines.append(f"### Q{r['id']}: {r['question']}\n")
        lines.append(f"**RAG** (score: {r['rag_score']['relevance']}/{r['rag_score']['groundedness']}/{r['rag_score']['helpfulness']}):")
        lines.append(f"> {r['rag_response'][:300]}{'...' if len(r['rag_response']) > 300 else ''}\n")
        lines.append(f"Judge: _{r['rag_score'].get('reasoning', '')}_\n")
        lines.append(f"**No-RAG** (score: {r['no_rag_score']['relevance']}/{r['no_rag_score']['groundedness']}/{r['no_rag_score']['helpfulness']}):")
        lines.append(f"> {r['no_rag_response'][:300]}{'...' if len(r['no_rag_response']) > 300 else ''}\n")
        lines.append(f"Judge: _{r['no_rag_score'].get('reasoning', '')}_\n")
        lines.append("---\n")

    return "\n".join(lines)


async def main():
    with open(QUESTIONS_FILE) as f:
        questions = json.load(f)

    db = SessionLocal()
    results = []

    print(f"Evaluating {len(questions)} questions...")

    for q in questions:
        qid = q["id"]
        print(f"  [{qid}/{len(questions)}] {q['question'][:50]}...", end=" ", flush=True)

        rag_resp = await run_rag(q["question"], db)
        no_rag_resp = await run_no_rag(q["question"])

        rag_score, no_rag_score = await asyncio.gather(
            judge(q["question"], rag_resp),
            judge(q["question"], no_rag_resp),
        )

        results.append({
            "id": qid,
            "group": q["group"],
            "question": q["question"],
            "rag_response": rag_resp,
            "no_rag_response": no_rag_resp,
            "rag_score": rag_score,
            "no_rag_score": no_rag_score,
        })

        rs = rag_score
        ns = no_rag_score
        print(f"RAG={rs['relevance']}/{rs['groundedness']}/{rs['helpfulness']} "
              f"NoRAG={ns['relevance']}/{ns['groundedness']}/{ns['helpfulness']}")

    db.close()

    report = generate_report(results)
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(report, encoding="utf-8")
    print(f"\nReport written to {OUTPUT_FILE}")

    raw_file = OUTPUT_FILE.with_suffix(".json")
    raw_file.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Raw data written to {raw_file}")


if __name__ == "__main__":
    asyncio.run(main())
