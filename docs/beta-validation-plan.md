# Video Beta Validation Plan

## Decision

Keep the anonymous beta gate until usage proves that it is the bottleneck. Do
not add real authentication yet. The email entered in the beta modal is a
local gate value; it is not sent to the telemetry endpoint or used as an
account identity.

## Minimal event contract

The browser sends coarse events to `POST /api/telemetry` with a browser-local
random session id, operation, request id when available, duration, HTTP
status, trial state, score bucket, prompt-length bucket, and client version.
It never sends prompts, model output, email addresses, authorization headers,
API keys, or raw provider errors.

| Funnel stage | Events |
| --- | --- |
| Session | `beta_session_start` |
| Preflight | `preflight_started`, `preflight_succeeded`, `preflight_failed` |
| Rewrite | `rewrite_requested`, `rewrite_copied`, `rewrite_re_evaluated`, `rewrite_failed` |
| Compare | `compare_started`, `compare_completed`, `compare_failed` |
| Tournament | `tournament_started`, `tournament_completed`, `tournament_failed` |
| Gate and feedback | `beta_gate_shown`, `beta_gate_completed`, `feedback_submitted` |

## Validation window and auth trigger

Observe for at least 14 days and 20 anonymous sessions. These are future
decision thresholds, not current results:

- Keep the local gate if fewer than 10 sessions reach `beta_gate_shown`.
- Review onboarding/value communication if at least 10 reach the gate but
  fewer than 3 complete it.
- Consider real Auth only after at least 10 sessions reach the gate and at
  least 3 complete it, or repeat use is visible across multiple days.

## Metric definitions

For a stated UTC window, calculate these from sanitized `type=beta_event`
records. The repository does not currently claim any traffic or conversion
results.

| Metric | Definition |
| --- | --- |
| Activation | distinct sessions with `preflight_succeeded` / distinct sessions with `beta_session_start` |
| Completion rate | `preflight_succeeded / preflight_started` |
| Rewrite engagement | `rewrite_requested / preflight_succeeded` |
| Rewrite reuse | (`rewrite_copied + rewrite_re_evaluated`) / `rewrite_requested` |
| Repeat session | a session with events on more than one UTC date |
| Latency | p50 and p95 of `duration_ms` for successful operation events |
| Reliability | successful operation events / started operation events |
| Gate completion | `beta_gate_completed / beta_gate_shown` |
| Safety | accepted telemetry records containing prompt/output/email-like fields; target is 0 |

## Review procedure

Group structured logs by `event`, `session_id`, `operation`, `http_status`, and
UTC date. Use session ids only for internal aggregation. Do not paste raw
session ids or raw logs into public docs. A successful health response proves
function availability only; it does not prove DeepSeek credentials or upstream
quota health.
