# Video Beta Validation Plan

> Canonical version: [docs/beta-validation-plan.md](./beta-validation-plan.md)

This compatibility file remains for older links. Keep the lower-case document
as the source of truth for the current beta validation contract.

## Decision

Keep the current anonymous beta gate until usage proves that it is the bottleneck. Do not add real authentication yet.

The current gate is intentionally a product experiment, not an account system. The email entered in the beta modal is stored locally and is not sent to the server.

## What is measured

The UI sends anonymous events to `POST /api/telemetry`. The payload contains a browser-local random session id, event name, operation, request id when available, duration, HTTP status, trial state, score bucket, and prompt-length bucket. It never contains prompts, email addresses, authorization headers, or raw provider errors.

| Event | Meaning |
| --- | --- |
| `beta_session_start` | A visitor started an anonymous browser session |
| `preflight_started` / `preflight_succeeded` / `preflight_failed` | Single-prompt funnel |
| `compare_started` / `compare_completed` / `compare_failed` | A/B comparison funnel |
| `tournament_started` / `tournament_completed` / `tournament_failed` | Multi-prompt ranking funnel |
| `rewrite_requested` / `rewrite_copied` / `rewrite_reevaluated` / `rewrite_failed` | Rewrite engagement and reuse |
| `beta_gate_shown` | The free preview blocked another run |
| `beta_gate_completed` | The visitor completed the local beta gate |
| `beta_history_opened` | The visitor opened saved history |
| `feedback_submitted` | The visitor sent an anonymous Yes/Not really signal |

## Validation window

Observe for 14 days or until at least 20 anonymous sessions have arrived, whichever comes later. Treat these as decision thresholds, not current facts:

- Keep the local gate if fewer than 10 sessions reach `beta_gate_shown`.
- Investigate onboarding or value communication if 10 or more reach the gate but fewer than 3 submit it.
- Consider real Auth only if at least 10 reach the gate and at least 3 submit it, or if repeat usage is visible in `beta_session_start`/`preflight_started` across multiple days.

This prevents building Auth for an empty beta while still giving a clear trigger when the local gate becomes a real retention or identity limitation.

## Observability boundary

Provider execution already emits in-process metrics for provider, task, latency, success, error type, and score. Beta telemetry adds the product funnel around those calls. Netlify function logs are the first sink; no analytics vendor or database schema is required for this validation phase.

`GET /api/health` is a cheap application health check. It does not call DeepSeek, so a healthy response means the deployed function is available, not that provider credentials or upstream quota are healthy.

## Metric definitions

For a stated UTC window, compute these from sanitized `type=beta_event` logs:

| Metric | Definition |
| --- | --- |
| Activation | distinct `session_id` with `preflight_succeeded`, divided by distinct sessions with `beta_session_start` |
| Preflight completion | `preflight_succeeded / preflight_started` |
| Rewrite engagement | `rewrite_requested / preflight_succeeded` |
| Rewrite reuse | (`rewrite_copied + rewrite_reevaluated`) / `rewrite_requested` |
| Repeat session | a session with events on more than one UTC date |
| Latency p50/p95 | percentile of `duration_ms` on successful operation events |
| Reliability | successful operation events / started operation events |
| Gate completion | `beta_gate_completed / beta_gate_shown` |
| Safety | count of prompt/output/email-like fields observed in accepted telemetry; target is 0 |

These are definitions, not current product results. The repository does not claim traffic, retention, p50/p95, conversion, uptime, or user counts until logs are actually exported and grouped.

Review the logs by searching for `type=beta_event` and grouping by `event`, `session_id`, `operation`, and `http_status`. Use session ids only for internal aggregation; do not paste raw log lines containing them into public documentation.
