# INC-007: Node soak deadline masked the route's typed timeout

- Status: fixed in harness; application incident remains INC-006
- Detected: Netlify Deploy Preview #2 on 2026-08-12

## Symptom

The Node-based soak script returned six `transport_timeout` samples at almost
exactly 20 seconds. The same preview, queried through the UTF-8 .NET client,
returned explicit HTTP 503 responses with `errorType=timeout` around the same
window. The harness was aborting just before the route response became
observable.

## Diagnosis

The application had a two-attempt provider budget: each attempt was bounded,
then the route returned a typed 503. The soak harness used a 20-second client
deadline, so it could race the second provider attempt and classify a server
response as a client transport failure.

## Fix

Raise only the harness deadline to 25 seconds and record it in the JSON report.
This does not increase the server/provider deadline; it gives the test enough
time to observe the application's bounded failure response.

## Verification

Re-run:

```powershell
npm run soak:http -- https://deploy-preview-2--videopromptqa.netlify.app 6 1500 artifacts\video-preview-6-soak.json
```

Interpret `http_status=503` with `error_type=timeout` as an application
provider incident, and `transport_timeout` only as a remaining client/network
failure.
