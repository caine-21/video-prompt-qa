import assert from "node:assert/strict";
import test from "node:test";
import { BoundedSemanticAnalyst } from "../../lib/preflight/semantic-analyst.ts";

const request = {
  prompt: "One ceramic mug on a table, locked camera, soft daylight, no text.",
  target_model: "benchmark-generic-video-v1",
  duration: 5,
  aspect_ratio: "16:9",
  mode: "text-to-video",
  references: [],
  hard_constraints: []
};

test("semantic analysis terminates when a provider ignores abort signals", async () => {
  const analyst = new BoundedSemanticAnalyst([{
    name: "hung-provider",
    async complete() {
      return new Promise(() => {});
    }
  }], { timeout_ms: 20, max_provider_calls: 1, retry_limit: 0 });

  const outcome = await Promise.race([
    analyst.analyze(request),
    new Promise((resolve) => setTimeout(() => resolve("escaped-deadline"), 150))
  ]);

  assert.notEqual(outcome, "escaped-deadline");
  assert.equal(outcome.status, "UNAVAILABLE");
  assert.equal(outcome.provider_calls, 1);
  assert.equal(outcome.errors[0].domain, "INFRA_ERROR");
  assert.equal(outcome.errors[0].code, "TIMEOUT");
  assert.match(outcome.errors[0].message, /deadline/i);
});

test("invalid structured output falls back within a two-call budget", async () => {
  let thirdProviderCalls = 0;
  const validPayload = JSON.stringify({ findings: [], uncertainties: [], suggested_revision: null });
  const analyst = new BoundedSemanticAnalyst([
    {
      name: "primary",
      async complete() {
        return { text: `\`\`\`json\n${validPayload}\n\`\`\``, model: "primary-v1", token_usage: 10 };
      }
    },
    {
      name: "fallback",
      async complete() {
        return { text: validPayload, model: "fallback-v1", token_usage: 12 };
      }
    },
    {
      name: "unused-third-provider",
      async complete() {
        thirdProviderCalls += 1;
        return { text: validPayload, model: "third-v1", token_usage: 1 };
      }
    }
  ], { timeout_ms: 100, max_provider_calls: 2, retry_limit: 0 });

  const outcome = await analyst.analyze(request);

  assert.equal(outcome.status, "OK");
  assert.equal(outcome.provider, "fallback");
  assert.equal(outcome.provider_calls, 2);
  assert.equal(outcome.retry_count, 1);
  assert.equal(outcome.errors.length, 1);
  assert.equal(outcome.errors[0].code, "MALFORMED_OUTPUT");
  assert.equal(thirdProviderCalls, 0);
});
