import { readFileSync, writeFileSync } from "node:fs";

const CASES_PATH = process.argv[2] ?? "data/prompt_case_seed_v0.json";
const OUTPUT_PATH = process.argv[3] ?? "data/preflight_records_seed_v0.json";
const RUBRIC_PATH = process.argv[4] ?? "data/preflight_rubric_v0.json";
const SCHEMA_PATH = process.argv[5] ?? "data/preflight_record_schema_v0.json";

const HARNESS_VERSION = "preflight_harness_v0";
const CREATED_AT = "2026-07-01T00:00:00.000Z";

const decisionPriority = {
  needs_review: 4,
  revise_first: 3,
  unknown: 2,
  generate_ok: 1
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function splitInterventions(value) {
  if (typeof value !== "string") return [];
  return value
    .split(";")
    .map(item => item.trim())
    .filter(Boolean);
}

function mapImpactToDecision(impact) {
  if (impact === "allow") return "generate_ok";
  if (impact === "revise_first") return "revise_first";
  if (impact === "warn" || impact === "do_not_generate_yet") return "needs_review";
  return "unknown";
}

function chooseDecision(decisions) {
  if (decisions.length === 0) return "unknown";
  return decisions.reduce((best, current) => (
    decisionPriority[current] > decisionPriority[best] ? current : best
  ), "generate_ok");
}

function combineConfidence(rules) {
  if (rules.length === 0) return "low";
  if (rules.some(rule => rule.confidence === "low")) return "low";
  if (rules.some(rule => rule.confidence === "medium")) return "medium";
  return "high";
}

function deriveEvidenceLevel(rules, hypothesisFlags) {
  if (rules.length === 0) return "unknown";
  if (hypothesisFlags.length === rules.length) return "hypothesis_heavy";
  if (hypothesisFlags.length > 0) return "partially_supported";
  if (rules.some(rule => rule.notes?.toLowerCase().includes("workflow-supported"))) return "workflow_supported";
  return "partially_supported";
}

function validateRecord(record, schema, weakTags) {
  const missing = schema.required_fields.filter(field => !(field in record));
  if (missing.length > 0) {
    throw new Error(`${record.record_id}: missing required fields ${missing.join(", ")}`);
  }

  for (const field of ["condition", "confidence", "evidence_level", "validation_group", "should_generate_decision"]) {
    const allowed = schema.enums[field];
    if (!Array.isArray(allowed)) {
      throw new Error(`schema enum missing for ${field}`);
    }
    if (!allowed.includes(record[field])) {
      throw new Error(`${record.record_id}: invalid ${field} ${record[field]}`);
    }
  }

  const missingHypothesisFlags = record.detected_risk_tags
    .filter(tag => weakTags.includes(tag))
    .filter(tag => !record.hypothesis_flags.includes(tag));
  if (missingHypothesisFlags.length > 0) {
    throw new Error(`${record.record_id}: weak-evidence tags missing from hypothesis_flags ${missingHypothesisFlags.join(", ")}`);
  }

  const expectedMetrics = schema.enums.expected_metrics_to_compare;
  const missingMetrics = expectedMetrics.filter(metric => !record.expected_metrics_to_compare.includes(metric));
  if (missingMetrics.length > 0) {
    throw new Error(`${record.record_id}: expected metrics missing ${missingMetrics.join(", ")}`);
  }
}

function buildUnknownRecord(item, schema) {
  return {
    run_id: runId,
    record_id: `${runId}-${item.id}`,
    harness_version: HARNESS_VERSION,
    rubric_version: "preflight_rubric_v0",
    case_id: item.id,
    condition: "treatment",
    created_at: CREATED_AT,
    raw_prompt: item.prompt,
    selected_model_or_tool: "unspecified",
    target_video_type: "unspecified",
    reference_availability: "unspecified",
    hard_requirements: [],
    constraints: [],
    expected_risk_tags: [],
    detected_risk_tags: [],
    matched_rule_ids: [],
    confidence: "low",
    evidence_level: "unknown",
    hypothesis_flags: [],
    rationale: "No seed risk annotations were available, so the offline harness did not infer semantic risk tags.",
    recommended_interventions: [],
    intervention_priority: [],
    should_generate_decision: "unknown",
    validation_group: "both",
    fixed_budget_ready: true,
    stop_when_usable_ready: true,
    expected_metrics_to_compare: schema.enums.expected_metrics_to_compare,
    notes_for_reviewer: item.notes ?? "Review manually before using this case in validation."
  };
}

function buildRecord(item, rulesByTag, schema, weakTags) {
  const riskTags = Array.isArray(item.prompt_side_risk_tags) ? item.prompt_side_risk_tags : [];
  if (riskTags.length === 0) return buildUnknownRecord(item, schema);

  const matchedRules = riskTags.map(tag => rulesByTag.get(tag)).filter(Boolean);
  const decisions = matchedRules.map(rule => mapImpactToDecision(rule.should_generate_impact));
  const interventions = unique(matchedRules.flatMap(rule => splitInterventions(rule.suggested_intervention)));
  const hypothesisFlags = riskTags.filter(tag => weakTags.includes(tag));
  const unknownTags = riskTags.filter(tag => !rulesByTag.has(tag));

  const rationaleParts = [
    `Used seed risk annotations for ${item.id}; no NLP or semantic inference was performed.`
  ];
  if (unknownTags.length > 0) {
    rationaleParts.push(`No rubric rule matched: ${unknownTags.join(", ")}.`);
  }
  if (hypothesisFlags.length > 0) {
    rationaleParts.push(`Hypothesis-heavy tags preserved separately: ${hypothesisFlags.join(", ")}.`);
  }

  return {
    run_id: runId,
    record_id: `${runId}-${item.id}`,
    harness_version: HARNESS_VERSION,
    rubric_version: "preflight_rubric_v0",
    case_id: item.id,
    condition: "treatment",
    created_at: CREATED_AT,
    raw_prompt: item.prompt,
    selected_model_or_tool: "unspecified",
    target_video_type: "unspecified",
    reference_availability: "unspecified",
    hard_requirements: [],
    constraints: [],
    expected_risk_tags: riskTags,
    detected_risk_tags: riskTags,
    matched_rule_ids: matchedRules.map(rule => rule.risk_tag),
    confidence: combineConfidence(matchedRules),
    evidence_level: deriveEvidenceLevel(matchedRules, hypothesisFlags),
    hypothesis_flags: hypothesisFlags,
    rationale: rationaleParts.join(" "),
    recommended_interventions: interventions,
    intervention_priority: interventions,
    should_generate_decision: chooseDecision(decisions),
    validation_group: "both",
    fixed_budget_ready: true,
    stop_when_usable_ready: true,
    expected_metrics_to_compare: schema.enums.expected_metrics_to_compare,
    notes_for_reviewer: item.notes ?? "Review before validation."
  };
}

const cases = readJson(CASES_PATH);
const rubric = readJson(RUBRIC_PATH);
const schema = readJson(SCHEMA_PATH);
const seedVersion = cases.version?.match(/prompt_case_seed_(v\d+)/)?.[1] ?? "v0";
const runId = `preflight_seed_${seedVersion}`;
const outputVersion = `preflight_records_seed_${seedVersion}`;
const rulesByTag = new Map(rubric.rules.map(rule => [rule.risk_tag, rule]));
const weakTags = schema.conservative_policy.weak_evidence_tags;

const records = cases.cases.map(item => buildRecord(item, rulesByTag, schema, weakTags));

for (const record of records) {
  validateRecord(record, schema, weakTags);
}

const output = {
  version: outputVersion,
  generated_by: HARNESS_VERSION,
  run_id: runId,
  created_at: CREATED_AT,
  inputs: {
    prompt_cases: CASES_PATH,
    preflight_rubric: RUBRIC_PATH,
    preflight_record_schema: SCHEMA_PATH
  },
  notes: "Offline deterministic harness output. Uses seed risk annotations only; no NLP, LLM judge, API calls, or autonomous agent behavior.",
  records
};

writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);

console.log(`Wrote ${records.length} preflight records to ${OUTPUT_PATH}`);
