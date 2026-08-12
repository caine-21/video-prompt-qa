# INC-002: Video provider contract failure drill

- Status: verified synthetic incident drill
- Detected: `npm run incident:drill` on 2026-08-13

## Incident

Evaluation providers may time out, return HTTP 429 repeatedly, or return text
that is not valid structured output. The current production registry contains
DeepSeek only; no second provider fallback is claimed in this record.

## Diagnosis

The typed provider boundary classified timeout, rate limit, and malformed JSON
separately. Redacted `provider_attempt_*` events made the attempt count and
retry budget visible without logging prompt contents or raw upstream errors.

## Fix

- Abort a DeepSeek request after 9 seconds instead of waiting for an opaque
  serverless/gateway cutoff.
- Keep one bounded retry for retryable provider failures.
- Return a typed failure when the retry budget is exhausted; never build a score
  from malformed output.

## Verification

```text
timeout:       success=true,  attempts=2, error_type=null
429 persistent: success=false, attempts=2, error_type=rate_limit
malformed:     success=false, attempts=1, error_type=invalid_response
```

Local verification also passed: 22 preflight tests, lint, and the production
build. The public Netlify soak remains a separate deployment verification step
because the observed site was running a different provider registry than this
working tree.
