# LangSmith Eval Metrics - ThePawsome

Generated: 2026-06-24T11:42:26.850548+00:00
Projects: `thepawsome-eval` for agent traces, `thepawsome-judge` for LLM-as-judge traces.

## Useful LangSmith Metrics

| Metric | Value | Why it matters |
|---|---:|---|
| Eval root runs | 50 | Phải khớp số eval cases. |
| Judge root runs | 50 | Phải tách khỏi agent traces để không lẫn latency/cost. |
| Eval error rate | 0.0% | Run health của agent eval. |
| Judge error rate | 0.0% | Run health của judge pipeline. |
| Agent latency p50 / p95 / p99 | 6.139s / 12.315s / 14.531s | Golden signal latency cho agent. |
| Judge latency p50 / p95 / p99 | 2.072s / 3.975s / 5.04s | Chi phí thời gian của LLM-as-judge. |
| Agent tokens / cost | 226,685 / $0.025923 | Token/cost budget của agent. |
| Judge tokens / cost | 56,881 / $0.187495 | Judge thường tốn hơn agent, cần theo dõi riêng. |
| Required-tool hit rate | 62.0% | Agent có gọi đúng tool bắt buộc không. |
| Tool-order rate | 60.0% | Luồng nhiều tool có đúng thứ tự không. |
| HITL handoff hit rate | 100.0% | Case cần người thật có chuyển giao không. |
| Unexpected handoff absence | 100.0% | Case bình thường có tránh chuyển người thật không. |
| Safety preflight hit rate | 100.0% | Guardrail preflight có chặn đúng case không. |
| Avg tool calls / case | 1.18 | Dấu hiệu agent over/under-tooling. |
| Judge average | 4.38 / 5 | Chất lượng câu trả lời theo LLM-as-judge. |
| Judge groundedness | 3.92 / 5 | Độ bám evidence/trace. |
| Judge safety | 4.44 / 5 | An toàn y tế, secret, handoff. |

## Project Health

| Project | Runs | P50 | P99 | Error | Tokens | Cost | Cache Read |
|---|---:|---:|---:|---:|---:|---:|---:|
| thepawsome-eval | 50 | 6.139s | 14.531s | 0.0 | 226,685 | $0.025923 | 179,200 |
| thepawsome-judge | 50 | 2.072s | 5.04s | 0.0 | 56,881 | $0.187495 | 0 |

## Tool Calls

| Tool | Calls | Errors | P50 Latency | P95 Latency | Max Latency |
|---|---:|---:|---:|---:|---:|
| get_pet_detail_tool | 2 | 0 | 0.065s | 0.085s | 0.087s |
| get_product_detail_tool | 6 | 0 | 0.095s | 0.13s | 0.13s |
| list_pets_tool | 7 | 0 | 0.041s | 0.482s | 0.581s |
| request_human_support_tool | 4 | 0 | 0.323s | 0.467s | 0.48s |
| search_knowledge_tool | 15 | 0 | 1.269s | 4.333s | 5.278s |
| search_products_tool | 25 | 0 | 0.745s | 1.334s | 1.433s |

## Trace Contract By Group

| Group | Cases | Required Tool | Tool Order | Handoff Accuracy | Safety Accuracy |
|---|---:|---:|---:|---:|---:|
| cart_boundary | 2 | 50.0% | 50.0% | 100.0% | 100.0% |
| guardrail | 6 | 66.7% | 66.7% | 100.0% | 100.0% |
| hitl | 4 | 100.0% | 100.0% | 100.0% | 100.0% |
| knowledge_rag | 12 | 66.7% | 66.7% | 100.0% | 100.0% |
| personalization | 8 | 25.0% | 12.5% | 100.0% | 100.0% |
| product_knowledge_combo | 6 | 50.0% | 50.0% | 100.0% | 100.0% |
| product_search | 12 | 75.0% | 75.0% | 100.0% | 100.0% |

## Judge Scores By Group

| Group | Cases | Avg | Relevance | Groundedness | Helpfulness | Safety |
|---|---:|---:|---:|---:|---:|---:|
| cart_boundary | 2 | 3.25 | 4 | 2.5 | 3 | 3.5 |
| guardrail | 6 | 4.67 | 5 | 4.33 | 4.5 | 4.83 |
| hitl | 4 | 5 | 5 | 5 | 5 | 5 |
| knowledge_rag | 12 | 4.38 | 5 | 3.58 | 4.75 | 4.17 |
| personalization | 8 | 3.38 | 3.62 | 2.88 | 3.38 | 3.62 |
| product_knowledge_combo | 6 | 4.46 | 4.67 | 4 | 4.67 | 4.5 |
| product_search | 12 | 4.85 | 4.92 | 4.58 | 4.92 | 5 |

## Notes

- Project isolation: OK (eval roots: agent_eval_case; judge roots: agent_eval_judge).
- Tool call counts from agent traces: {"get_pet_detail_tool": 2, "get_product_detail_tool": 6, "list_pets_tool": 7, "request_human_support_tool": 4, "search_knowledge_tool": 15, "search_products_tool": 25}.
- Judge average below 4/5: cases [15, 16, 19, 20, 27, 30, 31, 32, 33, 34, 35, 36, 46].
- Raw aggregate metrics are stored in `docs/ai-langsmith-metrics.json`.