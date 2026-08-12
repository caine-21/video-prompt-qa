import assert from "node:assert/strict";
import test from "node:test";
import { requestOutcome, statusClass, withApiObservability } from "../lib/observability.ts";
import { sanitizeEvent } from "../lib/beta-telemetry-contract.ts";

test("request logs classify status classes without response-body access", () => {
  assert.equal(statusClass(200), "2xx");
  assert.equal(statusClass(429), "4xx");
  assert.equal(statusClass(503), "5xx");
  assert.equal(requestOutcome(200), "success");
  assert.equal(requestOutcome(202), "success");
  assert.equal(requestOutcome(400), "rejected");
  assert.equal(requestOutcome(429), "rate_limited");
  assert.equal(requestOutcome(503), "error");
});

test("API request logs contain metadata but never request or response bodies", async () => {
  const originalInfo = console.info;
  const lines = [];
  console.info = (line) => lines.push(String(line));

  try {
    const request = new Request("https://example.test/api/evaluate", {
      method: "POST",
      body: JSON.stringify({ prompt: "secret user prompt" }),
      headers: { "content-type": "application/json" },
    });
    const response = await withApiObservability(request, {
      route: "/api/evaluate",
      feature: "evaluate",
      provider: "deepseek",
      model: "deepseek-v4-flash",
    }, async () => new Response(JSON.stringify({ output: "secret model output" }), { status: 200 }));

    assert.equal(response.status, 200);
    assert.match(response.headers.get("X-Request-ID") ?? "", /^[0-9a-f-]{36}$/);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /"type":"api_request"/);
    assert.match(lines[0], /"feature":"evaluate"/);
    assert.doesNotMatch(lines[0], /secret user prompt|secret model output/);
  } finally {
    console.info = originalInfo;
  }
});

test("beta telemetry accepts only coarse, privacy-safe fields", () => {
  const event = sanitizeEvent({
    event: "preflight_succeeded",
    session_id: "anon-session-1",
    operation: "evaluate",
    provider: "deepseek",
    request_id: "e44c501b-f820-469b-8c7b-284488497581",
    duration_ms: 13821,
    prompt_length_bucket: "121-500",
    score_bucket: "7-8",
    prompt: "secret user prompt",
    output: "secret model output",
    email: "user@example.com",
  });

  assert.deepEqual(event, {
    event: "preflight_succeeded",
    session_id: "anon-session-1",
    schema_version: 1,
    source: "beta_ui",
    operation: "evaluate",
    provider: "deepseek",
    request_id: "e44c501b-f820-469b-8c7b-284488497581",
    duration_ms: 13821,
    prompt_length_bucket: "121-500",
    score_bucket: "7-8",
  });
  assert.equal(sanitizeEvent({ event: "preflight_succeeded", session_id: "bad id" }), null);
  assert.equal(sanitizeEvent({ event: "not_allowlisted", session_id: "anon-session-1" }), null);
});
