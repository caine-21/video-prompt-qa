import assert from "node:assert/strict";
import test from "node:test";
import { buildCompareResult, buildEvaluationResult } from "../../lib/providers/base.ts";

test("legacy evaluator rejects out-of-contract structured output at runtime", () => {
  assert.throws(() => buildEvaluationResult("A detailed prompt long enough for evaluation.", "deepseek", {
    dimensions: [{ name: "Clarity", score: 99, feedback: "invalid score" }],
    improvements: [],
    edgeCases: []
  }), /too big|less than or equal|validation/i);
});

test("legacy comparison rejects an invalid winner instead of casting it", () => {
  assert.throws(() => buildCompareResult("Prompt A", "Prompt B", "deepseek", {
    winner: "C",
    scoreA: 8,
    scoreB: 7,
    reasoning: "Invalid winner test."
  }), /invalid|option|validation/i);
});
