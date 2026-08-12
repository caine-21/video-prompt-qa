import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PreflightResultSchema } from "../lib/preflight/contracts.ts";
import { PreflightSession } from "../lib/preflight/session.ts";
import { calculateCoverage, calculateDecisionMetrics, normalizeLegacyDecision } from "./lib/gate1-metrics.mjs";

const benchmark = JSON.parse(readFileSync("data/preflight_benchmark_v1.json", "utf8"));
const seed = JSON.parse(readFileSync("data/prompt_case_seed_v1.json", "utf8"));
const baseline = JSON.parse(readFileSync("data/preflight_records_seed_v1.json", "utf8"));
const seedById = new Map(seed.cases.map((item) => [item.id, item]));

function failureSlices(cases, predictions) {
  return {
    false_blocks: cases
      .filter((item) => item.expected_decision === "READY_TO_GENERATE" && predictions.get(item.id) !== "READY_TO_GENERATE")
      .map((item) => item.id),
    unsafe_passes: cases
      .filter((item) => item.expected_decision !== "READY_TO_GENERATE" && predictions.get(item.id) === "READY_TO_GENERATE")
      .map((item) => item.id),
    decision_mismatches: cases
      .filter((item) => predictions.has(item.id) && predictions.get(item.id) !== item.expected_decision)
      .map((item) => item.id)
  };
}

function latencySummary(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (value) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))];
  return {
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    p50: percentile(0.5),
    p95: percentile(0.95),
    unit: "ms",
    scope: "local offline replay; excludes network provider latency"
  };
}

function frozenAnalyst(caseLabel, sourceCase) {
  return {
    async analyze() {
      const ready = caseLabel.expected_decision === "READY_TO_GENERATE";
      return {
        status: "OK",
        findings: ready ? [] : [{
          id: `${caseLabel.id.toLowerCase()}-frozen-finding`,
          type: sourceCase.prompt_side_risk_tags.includes("prompt_conflict") ? "SEMANTIC_CONFLICT" : "SEMANTIC_RISK",
          severity: caseLabel.risk_severity,
          confidence: "HIGH",
          summary: `Frozen semantic annotation for: ${sourceCase.prompt_side_risk_tags.join(", ") || "unclassified risk"}.`,
          evidence_excerpt: sourceCase.prompt,
          preventability: caseLabel.preventable_failure === true ? "PREVENTABLE" : "UNCERTAIN",
          risk_pattern_ids: sourceCase.prompt_side_risk_tags,
          recommended_action: caseLabel.allowed_revision_scope === "USER_INPUT_REQUIRED"
            ? "Ask the user to resolve the unsupported or uncertain requirement."
            : "Revise only the conflicting or overloaded part of the prompt."
        }],
        uncertainties: [],
        suggested_revision: null,
        provider: "frozen-benchmark-annotation",
        model: "annotation-replay-v1",
        provider_calls: 0,
        retry_count: 0,
        token_usage: null,
        errors: []
      };
    }
  };
}

async function runTreatment() {
  const results = [];
  for (const caseLabel of benchmark.cases) {
    const sourceCase = seedById.get(caseLabel.id);
    if (!sourceCase) continue;
    const session = new PreflightSession({ semanticAnalyst: frozenAnalyst(caseLabel, sourceCase) });
    const result = await session.run({
      prompt: sourceCase.prompt,
      target_model: "benchmark-generic-video-v1",
      duration: 5,
      aspect_ratio: "16:9",
      mode: "text-to-video",
      references: [],
      hard_constraints: caseLabel.hard_constraints
    });
    results.push({ case_id: caseLabel.id, result: PreflightResultSchema.parse(result) });
  }
  return results;
}

const predictions = new Map(baseline.records.map((item) => [
  item.case_id,
  normalizeLegacyDecision(item.should_generate_decision)
]));

const b1Metrics = calculateDecisionMetrics(benchmark.cases, predictions);
const treatmentFirst = await runTreatment();
const treatmentSecond = await runTreatment();
const treatmentPredictions = new Map(treatmentFirst.map((item) => [item.case_id, item.result.decision]));
const secondPredictions = new Map(treatmentSecond.map((item) => [item.case_id, item.result.decision]));
const treatmentMetrics = calculateDecisionMetrics(benchmark.cases, treatmentPredictions);
const report = {
  report_version: "gate1_eval_report_v1",
  benchmark_version: benchmark.version,
  generated_at: new Date().toISOString(),
  claim_status: "PROVISIONAL_BENCHMARK",
  comparability: {
    B1: "Comparable on all 36 provisional decision labels, but uses seed risk annotations as oracle inputs.",
    B2: "N/A: no stored 36-case outputs from the current LLM evaluator exist.",
    T: "Comparable only as a deterministic decision-policy replay. Frozen semantic annotations replace live semantic detection."
  },
  systems: {
    B1_offline_rule_baseline: {
      description: "Frozen preflight_records_seed_v1 output from the deterministic rubric harness.",
      input_warning: "The harness copies human-authored seed risk tags; this is not end-to-end risk detection.",
      ...b1Metrics,
      structured_output_validity: calculateCoverage(baseline.records, (item) => (
        typeof item.case_id === "string" &&
        typeof item.should_generate_decision === "string" &&
        Array.isArray(item.matched_rule_ids)
      )),
      evidence_coverage: calculateCoverage(baseline.records, (item) => item.matched_rule_ids.length > 0),
      provider_calls: 0,
      latency_ms: null,
      latency_reason: "Historical offline records do not contain per-case latency.",
      failure_slices: failureSlices(benchmark.cases, predictions)
    },
    B2_current_llm_evaluator: {
      status: "N/A",
      reason: "No comparable stored run exists for all 36 benchmark cases; live provider calls are intentionally not fabricated or silently triggered.",
      decision_distribution: null,
      false_block_rate: null,
      unsafe_pass_rate: null,
      preventable_failure_recall: null,
      structured_output_validity: null,
      evidence_coverage: null,
      provider_calls: null,
      latency_ms: null,
      failure_slices: null
    },
    T_hybrid_preflight: {
      status: "DECISION_POLICY_REPLAY_ONLY",
      description: "Real PreflightSession, capability registry, typed tools, deterministic policy, evidence and trace; frozen semantic findings at the LLM boundary.",
      input_warning: "Expected decisions and semantic severity share provisional label provenance. Semantic detection quality is N/A and these results are not an independent end-to-end benchmark.",
      ...treatmentMetrics,
      structured_output_validity: calculateCoverage(treatmentFirst, (item) => PreflightResultSchema.safeParse(item.result).success),
      evidence_coverage: calculateCoverage(treatmentFirst, (item) => (
        item.result.evidence.length > 0 &&
        [...item.result.issues, ...item.result.warnings, ...item.result.uncertainties]
          .every((finding) => finding.evidence.length > 0)
      )),
      decision_consistency: calculateCoverage(treatmentFirst, (item) => (
        secondPredictions.get(item.case_id) === item.result.decision
      )),
      semantic_detection_metrics: null,
      semantic_detection_reason: "Frozen findings bypass semantic detection; an independently adjudicated provider run is required.",
      provider_calls: treatmentFirst.reduce((sum, item) => sum + item.result.trace.provider_calls, 0),
      latency: latencySummary(treatmentFirst.map((item) => item.result.trace.latency_ms)),
      failure_slices: failureSlices(benchmark.cases, treatmentPredictions)
    }
  }
};

function percentage(metric) {
  return metric?.value === null || metric?.value === undefined ? "N/A" : `${(metric.value * 100).toFixed(1)}%`;
}

const markdown = `# Implementation Gate 1 Evaluation\n\n` +
  `Status: **PROVISIONAL_BENCHMARK**. This is not production performance evidence.\n\n` +
  `| System | Decision distribution | False Block Rate | Unsafe PASS | Preventable Failure Recall | Structured Validity | Evidence Coverage |\n` +
  `|---|---:|---:|---:|---:|---:|---:|\n` +
  `| B1 offline rule baseline | ${JSON.stringify(report.systems.B1_offline_rule_baseline.decision_distribution)} | ${percentage(report.systems.B1_offline_rule_baseline.false_block_rate)} | ${percentage(report.systems.B1_offline_rule_baseline.unsafe_pass_rate)} | ${percentage(report.systems.B1_offline_rule_baseline.preventable_failure_recall)} | ${percentage(report.systems.B1_offline_rule_baseline.structured_output_validity)} | ${percentage(report.systems.B1_offline_rule_baseline.evidence_coverage)} |\n` +
  `| B2 current LLM evaluator | N/A | N/A | N/A | N/A | N/A | N/A |\n` +
  `| T hybrid preflight policy replay | ${JSON.stringify(report.systems.T_hybrid_preflight.decision_distribution)} | ${percentage(report.systems.T_hybrid_preflight.false_block_rate)} | ${percentage(report.systems.T_hybrid_preflight.unsafe_pass_rate)} | ${percentage(report.systems.T_hybrid_preflight.preventable_failure_recall)} | ${percentage(report.systems.T_hybrid_preflight.structured_output_validity)} | ${percentage(report.systems.T_hybrid_preflight.evidence_coverage)} |\n\n` +
  `## Failure slices\n\n` +
  `- B1 false blocks: ${report.systems.B1_offline_rule_baseline.failure_slices.false_blocks.join(", ")}\n` +
  `- T false blocks: ${report.systems.T_hybrid_preflight.failure_slices.false_blocks.join(", ") || "none"}\n` +
  `- T unsafe passes: ${report.systems.T_hybrid_preflight.failure_slices.unsafe_passes.join(", ") || "none"}\n\n` +
  `## Claim boundary\n\n` +
  `T validates deterministic orchestration, contracts, evidence, trace, and decision policy with a frozen semantic boundary. It does **not** validate live semantic detection, real generation outcomes, credit savings, or production latency.\n`;

mkdirSync("data/reports", { recursive: true });
writeFileSync("data/reports/gate1_eval_report.json", `${JSON.stringify(report, null, 2)}\n`);
writeFileSync("data/reports/gate1_eval_report.md", markdown);
console.log(JSON.stringify(report, null, 2));
