# INC-008: DeepSeek evaluation exceeded the bounded deadline

- Status: mitigation implemented locally; deployment verification pending
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
thinking is enabled by default. For this bounded scoring/rewrite pipeline,
that default can consume the provider deadline before the structured result is
returned. This is a working hypothesis, not a confirmed provider-side root
cause; account quota, provider latency, and deployment configuration remain
possible contributors.

## Fix

- Send `thinking: { type: "disabled" }` for DeepSeek V4 Flash requests.
- Keep the existing model, provider, retry budget, and fail-closed 503 behavior.
- Replace provider error logging that included the error message with a typed,
  redacted `provider_error` event.
- Add a regression test for the request body and secret-free diagnostics.

## Verification

- Local preflight: 26/26 PASS.
- Local provider diagnostics: 2/2 PASS.
- Lint: PASS.
- TypeScript: PASS.
- Production before this fix: timeout reproduced with HTTP 503.
- Post-fix preview/production smoke: pending deployment of this branch.

## Prevention

The request-level `api_request` log, `X-Request-ID`, redacted provider-attempt
events, typed provider-operation records, and this regression test make the
next timeout distinguishable from input rejection, rate limiting, or a silent
fallback. The provider remains DeepSeek-only.
