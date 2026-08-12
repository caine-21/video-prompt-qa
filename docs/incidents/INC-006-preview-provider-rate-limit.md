# INC-006: Historical Groq rate limit exhausted the fallback budget

> HISTORICAL: this incident predates the DeepSeek-only provider decision. The
> Groq observations and fallback metadata are retained to preserve the prior
> incident chain; the active runtime no longer configures or calls Groq.

- Status: contained; provider availability follow-up remains open
- Detected: Netlify Deploy Preview #2 after restoring Groq primary / DeepSeek fallback

## Impact

The preview health endpoint remained healthy. A first synthetic evaluation
request completed through Groq in about 4.4 seconds. During the following
low-rate run, Groq returned a rate-limit failure and the request moved to
DeepSeek; DeepSeek then exceeded its bounded provider budget and the route
returned HTTP 503 with a typed `timeout`.

The final six-request evidence run recorded six explicit
`requested_provider=groq`, `actual_provider=deepseek`, `fallback=true`,
`error_type=timeout` responses, with no client-side deadline masking the
application response. No fabricated evaluation score was returned.

## Diagnosis

This is distinct from the earlier 502/504 incident. The current deployment is
the expected Groq-primary / DeepSeek-fallback build, and the fallback metadata
is observable in the response. The failure topology is:

```text
Groq rate_limit
  -> DeepSeek fallback
  -> DeepSeek provider deadline
  -> typed 503 timeout
```

The evidence does not identify whether the Groq limit came from account quota,
concurrency, or provider-side policy; that requires provider dashboards, which
are outside this public smoke test.

## Fix already verified

- Restore the previously deployed Groq-primary / DeepSeek-fallback path.
- Apply the same bounded deadline, retry budget, error taxonomy, and redacted
  provider-attempt events to both providers.
- Preserve `requested_provider`, `actual_provider`, `fallback`, and
  `fallback_reason_code` in failure responses.
- Fail closed with 503 rather than inventing a score when both providers fail.

## Verification

- Health: HTTP 200, reports Groq primary and DeepSeek fallback.
- Single request: Groq success, HTTP 200, about 4.4 seconds.
- Follow-up single request after cooldown: Groq rate limit → DeepSeek timeout,
  HTTP 503 in about 20.6 seconds.
- Six-request soak after the harness deadline fix: 0/6 successful evaluations,
  fallback path observed in all six responses, p95 approximately 22.6 seconds;
  no unsafe or fabricated result.

## Follow-up

Keep this incident open until a fresh soak shows stable Groq success or a
second provider that completes within the route budget. Do not increase the
timeout to hide the provider failure; the current fail-closed behavior is
safer than returning an ungrounded evaluation.
