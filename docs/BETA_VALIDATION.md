# Video Beta Validation

## Decision

Keep the current anonymous beta gate until usage proves that it is the bottleneck. Do not add real authentication yet.

The current gate is intentionally a product experiment, not an account system. The email entered in the beta modal is stored locally and is not sent to the server.

## What is measured

The UI sends anonymous events to `POST /api/telemetry`. The payload contains a random browser session id, event name, mode, provider, latency, HTTP status, fallback state, trial state, and score. It never contains prompts, email addresses, authorization headers, or raw provider errors.

| Event | Meaning |
| --- | --- |
| `beta_landed` | A visitor loaded the workspace |
| `beta_run_started` | A visitor submitted an evaluation action |
| `beta_run_completed` | The action returned a usable result |
| `beta_run_failed` | The action failed, with sanitized status/category |
| `beta_gate_shown` | The free preview blocked another run |
| `beta_gate_submitted` | The visitor submitted the local beta email gate |
| `beta_history_opened` | The visitor opened saved history |

## Validation window

Observe for 14 days or until at least 20 anonymous sessions have arrived, whichever comes later. Treat these as decision thresholds, not current facts:

- Keep the local gate if fewer than 10 sessions reach `beta_gate_shown`.
- Investigate onboarding or value communication if 10 or more reach the gate but fewer than 3 submit it.
- Consider real Auth only if at least 10 reach the gate and at least 3 submit it, or if repeat usage is visible in `beta_landed`/`beta_run_started` across multiple days.

This prevents building Auth for an empty beta while still giving a clear trigger when the local gate becomes a real retention or identity limitation.

## Observability boundary

Provider execution already emits in-process metrics for provider, task, latency, success, error type, and score. Beta telemetry adds the product funnel around those calls. Netlify function logs are the first sink; no analytics vendor or database schema is required for this validation phase.

`GET /api/health` is a cheap application health check. It does not call DeepSeek, so a healthy response means the deployed function is available, not that provider credentials or upstream quota are healthy.

Review the logs by searching for `type=beta_event` and grouping by `event`, `session_id`, `mode`, and `http_status`. Do not paste raw log lines containing session ids into public documentation.
