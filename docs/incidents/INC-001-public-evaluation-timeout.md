# INC-001: Public evaluation requests reached the serverless deadline

- Status: mitigated in working tree; deployed verification pending
- Detected: bounded public soak against Netlify on 2026-08-12

Netlify function limit reference: [Functions configuration](https://docs.netlify.com/build/functions/configuration/).

## Impact

The public `/api/evaluate` endpoint returned `504`, `502`, `200`, and `502` in
one four-request run. Failed requests clustered around 30 seconds. The
successful response reported fallback metadata that did not match the current
working-tree registry, which contains DeepSeek only.

## Diagnosis

The public site was running a different deployment than the current working
tree, and its provider request had no application-level deadline short enough
to beat the observed gateway/upstream cutoff. Netlify's current documentation
lists a 60-second default synchronous Function limit, so the approximately
30-second cutoff observed here is not attributed to a Netlify hard limit. This
is both a timeout incident and a deployment-drift signal; the response alone
cannot prove which upstream provider was unhealthy.

## Fix

- Add a 9-second `fetchWithTimeout` at the DeepSeek boundary.
- Bound the generic provider retry budget to one retry, keeping the worst-case
  request path below the approximately 30-second platform deadline.
- Emit redacted `provider_attempt_*` events with provider, attempt, latency, and
  typed error code; never log prompt or raw provider error text.
- Add timeout-abort and incident-drill regression tests.

## Verification

- Video preflight suite: `22 passed`.
- `npm run incident:drill`: timeout recovery, persistent 429, and malformed
  structured output all pass their assertions.
- `npm run build`: production build passes.
- Required next step: deploy this branch, rerun `npm run soak:http`, and compare
  `/api/evaluate` results with the deployed commit. Until then this is a local
  mitigation, not a claim that the public site is fixed.
