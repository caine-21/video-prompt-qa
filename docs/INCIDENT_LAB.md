# Incident Lab

The incident loop uses common provider failure modes without claiming that a
synthetic failure was a live outage:

```text
failure fixture / public request
  -> redacted attempt event
  -> error taxonomy
  -> bounded retry or typed failure
  -> regression assertion
  -> repeatable report
```

## Cases

| Case | Mechanism | Expected behavior |
|---|---|---|
| timeout | request deadline / network delay | bounded retry, then success or typed failure |
| 429 rate limit | provider quota/concurrency pressure | bounded retry; never fabricate a score |
| malformed JSON/schema | provider response is not the contract | `invalid_response`, no evaluation result |
| semantic conflict | prompt asks for incompatible camera/continuity behavior | preflight marks revision/review risk |
| prompt too long / invalid parameters | deterministic request boundary | reject before semantic provider call |

DeepSeek's public error contract includes invalid format, auth, insufficient
balance, rate limit, server error, and overload responses. See the official
[error codes](https://api-docs.deepseek.com/quick_start/error_codes/) and
[rate-limit guidance](https://api-docs.deepseek.com/quick_start/rate_limit).

## Run

The drill is fully synthetic and does not read `.env.local`:

```powershell
npm run incident:drill
# optionally persist the redacted JSON evidence
npm run incident:drill -- artifacts\incidents\video-drill.json
```

The bounded public soak uses four common prompt shapes: a grounded prompt, a
cinematography-only prompt, a camera conflict, and a multi-shot continuity
request. It records status, provider diagnostics, score presence, and latency:

```powershell
npm run soak:http -- https://videopromptqa.netlify.app 6 1500 artifacts/video-soak.json
```

This is a smoke/soak artifact, not an availability SLO. Provider availability,
quality, and billing must be verified from server logs and provider dashboards;
the client never records prompt contents or raw provider errors.

## Current incident record

`docs/incidents/INC-001-public-evaluation-timeout.md` records the first public
soak result. A second preview run also showed a successful response taking
about 29 seconds, proving that a fetch abort alone was not enough in the
deployed runtime. The shared provider-call deadline now enforces the budget at
the orchestration seam. The next verification uses the previously observed
Groq-primary / DeepSeek-fallback deployment shape, with the same deadline and
typed events.
