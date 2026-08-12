import assert from "node:assert/strict";
import test from "node:test";
import { orchestrateEvaluate } from "../../lib/orchestrator.ts";
import { PROVIDER_REGISTRY } from "../../lib/providers/registry.ts";

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

test("fallback moves from Groq to DeepSeek and preserves the first failure code", async () => {
  const originalGroq = PROVIDER_REGISTRY.groq.evaluate;
  const originalDeepSeek = PROVIDER_REGISTRY.deepseek.evaluate;
  const calls = [];

  PROVIDER_REGISTRY.groq.evaluate = async () => {
    calls.push("groq");
    return {
      success: false,
      provider: "groq",
      error: { type: "rate_limit", message: "Groq rate limit", retryable: true },
    };
  };
  PROVIDER_REGISTRY.deepseek.evaluate = async () => {
    calls.push("deepseek");
    return success("deepseek", 8);
  };

  try {
    const result = await orchestrateEvaluate("A sufficiently detailed video prompt for provider strategy testing.", {
      providers: ["groq", "deepseek"],
      task: "evaluation",
      strategy: "fallback",
    });
    assert.equal(result.success, true);
    assert.equal(result.provider, "deepseek");
    assert.equal(result.fallbackReasonCode, "rate_limit");
    assert.deepEqual(calls, ["groq", "deepseek"]);
  } finally {
    PROVIDER_REGISTRY.groq.evaluate = originalGroq;
    PROVIDER_REGISTRY.deepseek.evaluate = originalDeepSeek;
  }
});
