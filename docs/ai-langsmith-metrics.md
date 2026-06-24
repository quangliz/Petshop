# LangSmith Eval Metrics - ThePawsome

Generated: 2026-06-24T11:12:42.023750+00:00
Projects: `thepawsome-eval` for agent traces, `thepawsome-judge` for LLM-as-judge traces.

## Useful LangSmith Metrics

| Metric | Value | Why it matters |
|---|---:|---|
| Eval root runs | 50 | Phải khớp số eval cases. |
| Judge root runs | 50 | Phải tách khỏi agent traces để không lẫn latency/cost. |
| Eval error rate | 0.0% | Run health của agent eval. |
| Judge error rate | 0.0% | Run health của judge pipeline. |
| Agent latency p50 / p95 / p99 | 7.071s / 15.062s / 16.666s | Golden signal latency cho agent. |
| Judge latency p50 / p95 / p99 | 1.998s / 2.812s / 6.747s | Chi phí thời gian của LLM-as-judge. |
| Agent tokens / cost | 182,181 / $0.02743 | Token/cost budget của agent. |
| Judge tokens / cost | 57,558 / $0.189278 | Judge thường tốn hơn agent, cần theo dõi riêng. |
| Required-tool hit rate | 82.0% | Agent có gọi đúng tool bắt buộc không. |
| Tool-order rate | 82.0% | Luồng nhiều tool có đúng thứ tự không. |
| HITL handoff hit rate | 100.0% | Case cần người thật có chuyển giao không. |
| Unexpected handoff absence | 100.0% | Case bình thường có tránh chuyển người thật không. |
| Safety preflight hit rate | 100.0% | Guardrail preflight có chặn đúng case không. |
| Avg tool calls / case | 1.18 | Dấu hiệu agent over/under-tooling. |
| Judge average | 4.63 / 5 | Chất lượng câu trả lời theo LLM-as-judge. |
| Judge groundedness | 4.28 / 5 | Độ bám evidence/trace. |
| Judge safety | 4.76 / 5 | An toàn y tế, secret, handoff. |

## Project Health

| Project | Runs | P50 | P99 | Error | Tokens | Cost | Cache Read |
|---|---:|---:|---:|---:|---:|---:|---:|
| thepawsome-eval | 50 | 7.071s | 16.666s | 0.0 | 182,181 | $0.02743 | 78,592 |
| thepawsome-judge | 50 | 1.998s | 6.747s | 0.0 | 57,558 | $0.189278 | 0 |

## Tool Calls

| Tool | Calls | Errors | P50 Latency | P95 Latency | Max Latency |
|---|---:|---:|---:|---:|---:|
| get_pet_detail_tool | 6 | 0 | 0.113s | 0.665s | 0.796s |
| list_pets_tool | 5 | 0 | 0.068s | 0.283s | 0.297s |
| request_human_support_tool | 4 | 0 | 0.138s | 0.197s | 0.207s |
| search_knowledge_tool | 20 | 0 | 1.347s | 7.97s | 9.262s |
| search_products_tool | 24 | 0 | 1.118s | 1.944s | 3.633s |

## Trace Contract By Group

| Group | Cases | Required Tool | Tool Order | Handoff Accuracy | Safety Accuracy |
|---|---:|---:|---:|---:|---:|
| cart_boundary | 2 | 100.0% | 100.0% | 100.0% | 100.0% |
| guardrail | 6 | 66.7% | 66.7% | 100.0% | 100.0% |
| hitl | 4 | 100.0% | 100.0% | 100.0% | 100.0% |
| knowledge_rag | 12 | 100.0% | 100.0% | 100.0% | 100.0% |
| personalization | 8 | 25.0% | 25.0% | 100.0% | 100.0% |
| product_knowledge_combo | 6 | 83.3% | 83.3% | 100.0% | 100.0% |
| product_search | 12 | 100.0% | 100.0% | 100.0% | 100.0% |

## Judge Scores By Group

| Group | Cases | Avg | Relevance | Groundedness | Helpfulness | Safety |
|---|---:|---:|---:|---:|---:|---:|
| cart_boundary | 2 | 4.12 | 4.5 | 3.5 | 4 | 4.5 |
| guardrail | 6 | 4.62 | 5 | 4.17 | 4.67 | 4.67 |
| hitl | 4 | 5 | 5 | 5 | 5 | 5 |
| knowledge_rag | 12 | 4.92 | 5 | 4.67 | 5 | 5 |
| personalization | 8 | 4.12 | 4.5 | 3.5 | 4.25 | 4.25 |
| product_knowledge_combo | 6 | 4.17 | 4.33 | 3.5 | 4.33 | 4.5 |
| product_search | 12 | 4.9 | 4.92 | 4.75 | 4.92 | 5 |

## Notes

- Project isolation: OK (eval roots: agent_eval_case; judge roots: agent_eval_judge).
- Tool call counts from agent traces: {"get_pet_detail_tool": 6, "list_pets_tool": 5, "request_human_support_tool": 4, "search_knowledge_tool": 20, "search_products_tool": 24}.
- Judge average below 4/5: cases [27, 28, 30, 32, 35, 38, 44].
- Raw aggregate metrics are stored in `docs/ai-langsmith-metrics.json`.