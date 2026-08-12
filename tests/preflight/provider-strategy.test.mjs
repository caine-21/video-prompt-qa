import assert from "node:assert/strict";
import test from "node:test";
import { orchestrateEvaluate } from "../../lib/orchestrator.ts";
import { ALL_PROVIDERS, PROVIDER_REGISTRY } from "../../lib/providers/registry.ts";

function success(provider, score) {
  return {
    success: true,
    provider,
    data: {
      prompt: "A sufficiently detailed video prompt for provider strategy testing.",
      provider,
      overallScore: score,
      dimensions: [],
      improvements: [],
      edgeCases: [],
      timestamp: new Date(0).toISOString()
    }
  };
}

test("default evaluation uses the sole configured provider", async () => {
  const originalDeepSeek = PROVIDER_REGISTRY.deepseek.evaluate;
  let calls = 0;

  PROVIDER_REGISTRY.deepseek.evaluate = async () => {
    calls += 1;
    return success("deepseek", 9);
  };

  try {
    const result = await orchestrateEvaluate("A sufficiently detailed video prompt for provider strategy testing.", {
      providers: ["deepseek"],
      task: "evaluation"
    });
    assert.equal(result.provider, "deepseek");
    assert.equal(calls, 1);
  } finally {
    PROVIDER_REGISTRY.deepseek.evaluate = originalDeepSeek;
  }
});

test("the runtime registry exposes DeepSeek as its only provider", () => {
  assert.deepEqual(ALL_PROVIDERS, ["deepseek"]);
  assert.deepEqual(Object.keys(PROVIDER_REGISTRY), ["deepseek"]);
});
