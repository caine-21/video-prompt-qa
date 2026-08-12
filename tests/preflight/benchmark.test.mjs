import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const benchmark = JSON.parse(readFileSync("data/preflight_benchmark_v1.json", "utf8"));
const seed = JSON.parse(readFileSync("data/prompt_case_seed_v1.json", "utf8"));

const decisions = new Set([
  "READY_TO_GENERATE",
  "NEEDS_REVISION",
  "NEEDS_USER_DECISION"
]);

test("benchmark freezes 36 provisional decision labels with provenance", () => {
  assert.equal(benchmark.version, "preflight_benchmark_v1");
  assert.equal(benchmark.cases.length, 36);

  for (const item of benchmark.cases) {
    assert.match(item.id, /^PC-\d{3}$/);
    assert.ok(decisions.has(item.expected_decision));
    assert.ok(["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(item.risk_severity));
    assert.ok([true, false, "UNKNOWN"].includes(item.preventable_failure));
    assert.ok(Array.isArray(item.hard_constraints));
    assert.ok(["NONE", "PROMPT_ONLY", "PROMPT_AND_PARAMETERS", "USER_INPUT_REQUIRED"].includes(item.allowed_revision_scope));
    assert.equal(item.label_provenance.status, "PROVISIONAL");
    assert.ok(item.label_provenance.source.length > 0);
  }
});

test("safe seed cases may have no prompt-side risk tag", () => {
  const safeCases = seed.cases.filter((item) => item.should_generate === true);
  assert.equal(safeCases.length, 13);
  assert.ok(safeCases.every((item) => item.prompt_side_risk_tags.length === 0));
});
