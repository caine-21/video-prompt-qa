import assert from "node:assert/strict";
import test from "node:test";
import { requestOutcome, statusClass, withApiObservability } from "../lib/observability.ts";

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
