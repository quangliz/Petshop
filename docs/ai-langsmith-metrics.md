# LangSmith Eval Metrics - ThePawsome

Generated: 2026-06-24T12:58:21.563634+00:00
Projects: `thepawsome-eval` for agent traces, `thepawsome-judge` for LLM-as-judge traces.

## Useful LangSmith Metrics

| Metric | Value | Why it matters |
|---|---:|---|
| Eval root runs | 50 | Phải khớp số eval cases. |
| Judge root runs | 50 | Phải tách khỏi agent traces để không lẫn latency/cost. |
| Eval error rate | 0.0% | Run health của agent eval. |
| Judge error rate | 0.0% | Run health của judge pipeline. |
| Agent latency p50 / p95 / p99 | 11.164s / 19.523s / 21.996s | Golden signal latency cho agent. |
| Judge latency p50 / p95 / p99 | 2.207s / 3.554s / 5.251s | Chi phí thời gian của LLM-as-judge. |
| Agent tokens / cost | 439,301 / $0.050332 | Token/cost budget của agent. |
| Judge tokens / cost | 84,178 / $0.257245 | Judge thường tốn hơn agent, cần theo dõi riêng. |
| Required-tool hit rate | 100.0% | Agent có gọi đúng tool bắt buộc không. |
| Tool-order rate | 100.0% | Luồng nhiều tool có đúng thứ tự không. |
| HITL handoff hit rate | 100.0% | Case cần người thật có chuyển giao không. |
| Unexpected handoff absence | 100.0% | Case bình thường có tránh chuyển người thật không. |
| Safety preflight hit rate | 100.0% | Guardrail preflight có chặn đúng case không. |
| Avg tool calls / case | 2.16 | Dấu hiệu agent over/under-tooling. |
| Judge average | 4.74 / 5 | Chất lượng câu trả lời theo LLM-as-judge. |
| Judge groundedness | 4.56 / 5 | Độ bám evidence/trace. |
| Judge safety | 4.86 / 5 | An toàn y tế, secret, handoff. |

## Project Health

| Project | Runs | P50 | P99 | Error | Tokens | Cost | Cache Read |
|---|---:|---:|---:|---:|---:|---:|---:|
| thepawsome-eval | 50 | 11.164s | 21.996s | 0.0 | 439,301 | $0.050332 | 328,064 |
| thepawsome-judge | 50 | 2.207s | 5.251s | 0.0 | 84,178 | $0.257245 | 0 |

## Tool Calls

| Tool | Calls | Errors | P50 Latency | P95 Latency | Max Latency |
|---|---:|---:|---:|---:|---:|
| get_pet_detail_tool | 7 | 0 | 0.043s | 0.184s | 0.244s |
| get_product_detail_tool | 45 | 0 | 0.08s | 0.166s | 0.212s |
| list_pets_tool | 1 | 0 | 0.082s | 0.082s | 0.082s |
| request_human_support_tool | 4 | 0 | 0.122s | 0.153s | 0.158s |
| search_knowledge_tool | 23 | 0 | 1.083s | 3.474s | 5.248s |
| search_products_tool | 28 | 0 | 0.705s | 1.083s | 2.062s |

## Trace Contract By Group

| Group | Cases | Required Tool | Tool Order | Handoff Accuracy | Safety Accuracy |
|---|---:|---:|---:|---:|---:|
| cart_boundary | 2 | 100.0% | 100.0% | 100.0% | 100.0% |
| guardrail | 6 | 100.0% | 100.0% | 100.0% | 100.0% |
| hitl | 4 | 100.0% | 100.0% | 100.0% | 100.0% |
| knowledge_rag | 12 | 100.0% | 100.0% | 100.0% | 100.0% |
| personalization | 8 | 100.0% | 100.0% | 100.0% | 100.0% |
| product_knowledge_combo | 6 | 100.0% | 100.0% | 100.0% | 100.0% |
| product_search | 12 | 100.0% | 100.0% | 100.0% | 100.0% |

## Judge Scores By Group

| Group | Cases | Avg | Relevance | Groundedness | Helpfulness | Safety |
|---|---:|---:|---:|---:|---:|---:|
| cart_boundary | 2 | 4.5 | 4.5 | 4.5 | 4 | 5 |
| guardrail | 6 | 4.92 | 5 | 5 | 4.67 | 5 |
| hitl | 4 | 5 | 5 | 5 | 5 | 5 |
| knowledge_rag | 12 | 4.71 | 4.83 | 4.42 | 4.75 | 4.83 |
| personalization | 8 | 4.53 | 4.75 | 4 | 4.62 | 4.75 |
| product_knowledge_combo | 6 | 4.5 | 4.67 | 4.17 | 4.67 | 4.5 |
| product_search | 12 | 4.9 | 4.83 | 4.92 | 4.83 | 5 |

## Notes

- Project isolation: OK (eval roots: agent_eval_case; judge roots: agent_eval_judge).
- Tool call counts from agent traces: {"get_pet_detail_tool": 7, "get_product_detail_tool": 45, "list_pets_tool": 1, "request_human_support_tool": 4, "search_knowledge_tool": 23, "search_products_tool": 28}.
- Judge average below 4/5: cases [17, 27, 33, 35].
- Raw aggregate metrics are stored in `docs/ai-langsmith-metrics.json`.