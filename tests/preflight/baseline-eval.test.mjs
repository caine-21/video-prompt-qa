import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateDecisionMetrics, normalizeLegacyDecision } from "../../scripts/lib/gate1-metrics.mjs";

const benchmark = JSON.parse(readFileSync("data/preflight_benchmark_v1.json", "utf8"));
const records = JSON.parse(readFileSync("data/preflight_records_seed_v1.json", "utf8"));

test("B1 captures the frozen all-safe-cases-blocked failure", () => {
  const predictions = new Map(records.records.map((item) => [
    item.case_id,
    normalizeLegacyDecision(item.should_generate_decision)
  ]));
  const metrics = calculateDecisionMetrics(benchmark.cases, predictions);

  assert.deepEqual(metrics.false_block_rate, { numerator: 13, denominator: 13, value: 1 });
  assert.deepEqual(metrics.unsafe_pass_rate, { numerator: 0, denominator: 23, value: 0 });
  assert.deepEqual(metrics.preventable_failure_recall, { numerator: 13, denominator: 13, value: 1 });
});
