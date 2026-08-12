# INC-005: Preview response exceeded the provider deadline

- Status: fix in follow-up commit; deployed verification pending
- Detected: Netlify Deploy Preview #2 on 2026-08-12

## Impact

A correctly encoded synthetic evaluation request returned HTTP 200 after
approximately 29 seconds. The preview was running the new DeepSeek-only
registry, but the request still exceeded the intended 9-second upstream
budget and remained close to the earlier public 502/504 window.

## Diagnosis

The lower-level `AbortController` deadline was present, but the deployed
runtime did not terminate the complete provider call at that seam. A fetch
abort alone therefore did not prove that the route would finish within its
budget.

## Fix

Enforce the same 9-second budget around the shared `safeProviderCall` with a
`Promise.race`, so a provider implementation that ignores abort cannot keep
the orchestration path open. Add a regression test with an underlying promise
that resolves after the deadline.

## Verification

- Preview request: HTTP 200, approximately 29 seconds before this follow-up.
- Follow-up preview soak after the deadline fix: 6/6 requests returned typed
  timeout results instead of 502/504, with a p95 near 20 seconds because the
  single-provider path retried once.
- Local regression test: must prove a non-cooperative provider call returns a
  typed `timeout` within the deadline.
- Required next step: verify the restored Groq-primary / DeepSeek-fallback path
  in a fresh preview/public soak. Do not treat a typed timeout alone as a
  healthy user experience.
