# Implementation Gate 1 Evaluation

Status: **PROVISIONAL_BENCHMARK**. This is not production performance evidence.

| System | Decision distribution | False Block Rate | Unsafe PASS | Preventable Failure Recall | Structured Validity | Evidence Coverage |
|---|---:|---:|---:|---:|---:|---:|
| B1 offline rule baseline | {"READY_TO_GENERATE":0,"NEEDS_REVISION":3,"NEEDS_USER_DECISION":33} | 100.0% | 0.0% | 100.0% | 100.0% | 63.9% |
| B2 current LLM evaluator | N/A | N/A | N/A | N/A | N/A | N/A |
| T hybrid preflight policy replay | {"READY_TO_GENERATE":13,"NEEDS_REVISION":13,"NEEDS_USER_DECISION":10} | 0.0% | 0.0% | 100.0% | 100.0% | 100.0% |

## Failure slices

- B1 false blocks: PC-007, PC-009, PC-012, PC-016, PC-018, PC-021, PC-023, PC-025, PC-027, PC-029, PC-032, PC-034, PC-036
- T false blocks: none
- T unsafe passes: none

## Claim boundary

T validates deterministic orchestration, contracts, evidence, trace, and decision policy with a frozen semantic boundary. It does **not** validate live semantic detection, real generation outcomes, credit savings, or production latency.
