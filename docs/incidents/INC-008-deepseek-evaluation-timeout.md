# INC-008: DeepSeek evaluation exceeded the bounded deadline

- Status: first mitigation ineffective; timeout-budget adjustment pending deployment
- Detected: production smoke after merge `c775cefc`
- Scope: one synthetic evaluation request; no user prompt or model output was retained

## Symptom

The production homepage and health endpoint returned HTTP 200. A valid
synthetic evaluation request returned HTTP 503 with `errorType=timeout` after
approximately 19 seconds. No evaluation score was returned. Sending the legacy
`provider=groq` field produced the same DeepSeek 503 and did not call Groq.

## Diagnosis

The request used `deepseek-v4-flash` and did not explicitly set a thinking mode.
DeepSeek's current API documentation says V4 Flash supports thinking and that
thinking is enabled by default. The first mitigation explicitly disabled
thinking, but the same timeout reproduced in preview, so that hypothesis was
not sufficient. Account quota, provider latency, network path, and deployment
configuration remain possible contributors.

## Fix

- Send `thinking: { type: "disabled" }` for DeepSeek V4 Flash requests.
- Give the single DeepSeek attempt a 20-second provider budget and disable the
  redundant retry. This gives one request a larger bounded window without
  multiplying provider load.
- Keep the existing model, provider, and fail-closed 503 behavior.
- Replace provider error logging that included the error message with a typed,
  redacted `provider_error` event.
- Add a regression test for the request body and secret-free diagnostics.

## Verification

- Local preflight: 26/26 PASS.
- Local provider diagnostics: 2/2 PASS.
- Lint: PASS.
- TypeScript: PASS.
- Production before this fix: timeout reproduced with HTTP 503.
- Post-thinking-mode preview smoke: still timed out at about 19 seconds.
- Post-timeout-budget preview/production smoke: pending deployment of this branch.

## Prevention

The request-level `api_request` log, `X-Request-ID`, redacted provider-attempt
events, typed provider-operation records, and this regression test make the
next timeout distinguishable from input rejection, rate limiting, or a silent
fallback. The provider remains DeepSeek-only.
