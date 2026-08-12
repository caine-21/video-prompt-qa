# Public Beta Observability

Status: `CURRENT VERIFIED` for the logging paths in this repository. This
document defines what the runtime emits; it does not claim a dashboard,
historical traffic volume, or an availability SLO.

## Request-level logs

The evaluation, compare, rewrite, tournament, batch, preflight, feedback,
stats, and health routes are wrapped by `lib/observability.ts`. Each completed
request emits one JSON log with:

```json
{
  "type": "api_request",
  "request_id": "<random uuid>",
  "timestamp": "<ISO timestamp>",
  "method": "POST",
  "route": "/api/evaluate",
  "feature": "evaluate",
  "status": 200,
  "status_class": "2xx",
  "outcome": "success",
  "latency_ms": 1234,
  "provider": "deepseek",
  "model": "deepseek-v4-flash"
}
```

The response also carries `X-Request-ID` for locating the corresponding
`api_request` line in platform logs. The wrapper never reads request or
response bodies, so prompts, model output, API keys, tokens, and email
addresses are not added to request logs.

## Existing provider and beta events

- `provider_attempt` records redacted DeepSeek attempt start/success/failure,
  latency, retry count, and typed error category.
- `provider_operation` records task, strategy, latency, success, score when a
  score exists, and typed provider error category.
- `/api/telemetry` accepts allowlisted beta events from the browser. The
  current funnel events are `beta_landed`, `beta_run_started`,
  `beta_run_completed`, `beta_run_failed`, `beta_gate_shown`,
  `beta_gate_submitted`, and `beta_history_opened`.

Telemetry is rate-limited and schema-sanitized. The browser session id is an
anonymous local UUID; the product path does not send the user email or prompt
content to this endpoint.

## Metric definitions

These metrics can be computed from the structured log stream without inventing
data:

| Metric | Definition |
|---|---|
| request count | count of `type=api_request` records |
| success count | request records with `outcome=success` |
| error count | request records with `outcome=error` |
| success rate | success count / request count for a stated time window |
| DeepSeek error count | `provider=deepseek` and `outcome=error`, or provider-attempt `error_type` records |
| rate-limit hit count | request `outcome=rate_limited` plus provider-attempt `error_type=rate_limit`, reported separately by layer |
| latency p50/p95 | percentile over `latency_ms` for a stated route/feature/time window |
| feature invocation count | group `api_request` by `feature`, or beta run events by `mode` |
| beta gate exposure/completion | counts of `beta_gate_shown` / `beta_gate_submitted` |
| free quota exhaustion | count of `beta_gate_shown` with `trial_remaining=0` |

The current implementation emits raw structured logs but does not persist or
aggregate them into a dashboard. Therefore no traffic, p50/p95, DAU/WAU,
retention, conversion, SLA, production scale, paying-user, or mature-auth
claim is made here.

## Operational reading order

For one failed request, locate the `api_request` line by `X-Request-ID`, then
inspect nearby provider logs by route/task and timestamp:

```text
api_request
  -> provider_attempt (provider/context/latency/error category)
  -> provider_operation (provider/task/latency/success)
  -> beta_run_failed (if the request came from the beta UI)
```

Provider-attempt and provider-operation records do not yet carry the same
request id, so this is coarse log correlation rather than a distributed trace.

The current provider policy is DeepSeek-only. Historical Groq fallback records
remain under `docs/incidents/` as incident provenance and are not current
runtime behavior.
