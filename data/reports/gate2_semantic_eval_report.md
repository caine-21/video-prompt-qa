# Implementation Gate 2 — Semantic Reliability

Gate 2 status: **BLOCKED_LIVE_RUN**

POLICY_REPLAY and LIVE_SEMANTIC are deliberately separated. Gate 1 replay is not semantic-quality evidence.

## Frozen configuration

- Provider/model: deepseek / deepseek-v4-flash
- Temperature: 0
- Per-case budget: 1 call, 0 retries, 12000 ms
- Fallback: false
- Manifest SHA-256: `642b88ff8d29de12ee3d1d03956d0231b087d73efd0de6ffa833423c3d27994b`

## Semantic finding metrics

| Split | Valid cases | Precision | Recall | Safe false positive | High-severity miss | Evidence support | Structured validity |
|---|---:|---:|---:|---:|---:|---:|---:|
| DEV | BLOCKED | N/A | N/A | N/A | N/A | N/A | N/A |
| HOLDOUT | BLOCKED | N/A | N/A | N/A | N/A | N/A | N/A |

## Decision metrics

| Split | Valid cases | False block | Unsafe PASS | NEEDS_USER_DECISION |
|---|---:|---:|---:|---:|
| DEV | BLOCKED | N/A | N/A | N/A |
| HOLDOUT | BLOCKED | N/A | N/A | N/A |

## Failure slices

LIVE_SEMANTIC not run; failure slices are N/A.

## Top missed findings

N/A — LIVE_SEMANTIC not run.

## Top spurious findings

N/A — LIVE_SEMANTIC not run.

## Provider / infrastructure

- LIVE_SEMANTIC was not started: DEEPSEEK_API_KEY is not available in the current process. No .env file was read.
- Provider calls: 0

## Dataset and claim boundary

- Dataset: semantic_eval_dataset_v1; DEV 14, HOLDOUT 14.
- Safe cases: DEV 4, HOLDOUT 3.
- Labels were authored before the first provider run, but human adjudication is PENDING; all quality metrics remain provisional.
- Contamination audit: PASS.
- No claims are made about real generation success, credits saved, production accuracy, or LLM-native tool calling.
