import { readFileSync, writeFileSync } from "node:fs";

const inputPath = process.argv[2] ?? "data/preflight_records_seed_v1.json";
const outputPath = process.argv[3] ?? "data/preflight_summary_seed_v1.json";

const requiredRecordFields = [
  "case_id",
  "record_id",
  "should_generate_decision",
  "confidence",
  "evidence_level",
  "detected_risk_tags",
  "hypothesis_flags",
  "recommended_interventions",
  "intervention_priority",
  "notes_for_reviewer"
];

function fail(message) {
  console.error(`Preflight summary failed: ${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`could not read or parse ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
}

function increment(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedObjectFromMap(map) {
  return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function sortedCounts(items) {
  const counts = new Map();
  for (const item of items) increment(counts, item);
  return sortedObjectFromMap(counts);
}

function topCounts(items, limit = 12) {
  const counts = new Map();
  for (const item of items) increment(counts, item);
  return [...counts.entries()]
    .sort(([tagA, countA], [tagB, countB]) => countB - countA || tagA.localeCompare(tagB))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

function caseIds(records) {
  return records.map(record => record.case_id).sort((a, b) => a.localeCompare(b));
}

function hasNoteSignal(record, signals) {
  const note = String(record.notes_for_reviewer ?? "").toLowerCase();
  return signals.some(signal => note.includes(signal));
}

const payload = readJson(inputPath);
const records = payload.records;
assertArray(records, "records");

for (const record of records) {
  const label = record.record_id ?? record.case_id ?? "<missing record id>";

  for (const field of requiredRecordFields) {
    if (!(field in record)) fail(`${label}: missing required field ${field}`);
  }

  for (const field of ["detected_risk_tags", "hypothesis_flags", "recommended_interventions", "intervention_priority"]) {
    assertArray(record[field], `${label}.${field}`);
  }
}

const recordsByDecision = {
  generate_ok: records.filter(record => record.should_generate_decision === "generate_ok"),
  revise_first: records.filter(record => record.should_generate_decision === "revise_first"),
  needs_review: records.filter(record => record.should_generate_decision === "needs_review"),
  unknown: records.filter(record => record.should_generate_decision === "unknown")
};

const recordsWithHypothesisFlags = records
  .filter(record => record.hypothesis_flags.length > 0)
  .map(record => ({
    case_id: record.case_id,
    record_id: record.record_id,
    hypothesis_flags: [...record.hypothesis_flags].sort((a, b) => a.localeCompare(b)),
    decision: record.should_generate_decision
  }))
  .sort((a, b) => a.case_id.localeCompare(b.case_id));

const safePassSignals = [
  "safe-pass",
  "lower-risk",
  "constrained",
  "static camera",
  "provided product",
  "product reference",
  "reference support",
  "prepared keyframe",
  "single constrained"
];
const highRiskSignals = [
  "high-risk",
  "review-trigger",
  "regulated",
  "brand-sensitive",
  "client-delivery",
  "do_not_generate",
  "exact text",
  "exact logo"
];

const potentialOverStrictCandidates = records
  .filter(record => record.should_generate_decision !== "generate_ok")
  .filter(record => hasNoteSignal(record, safePassSignals))
  .map(record => ({
    case_id: record.case_id,
    decision: record.should_generate_decision,
    reason: "Reviewer notes contain safe-pass, lower-risk, constrained, static-camera, or reference-support signals.",
    detected_risk_tags: [...record.detected_risk_tags].sort((a, b) => a.localeCompare(b))
  }))
  .sort((a, b) => a.case_id.localeCompare(b.case_id));

const potentialOverPermissiveCandidates = records
  .filter(record => record.should_generate_decision === "generate_ok")
  .filter(record => record.hypothesis_flags.length > 0 || hasNoteSignal(record, highRiskSignals))
  .map(record => ({
    case_id: record.case_id,
    decision: record.should_generate_decision,
    reason: "Record is generate_ok despite hypothesis flags or high-risk reviewer-note signals.",
    hypothesis_flags: [...record.hypothesis_flags].sort((a, b) => a.localeCompare(b))
  }))
  .sort((a, b) => a.case_id.localeCompare(b.case_id));

const humanReviewRecords = records
  .filter(record => record.should_generate_decision === "needs_review" || record.hypothesis_flags.length > 0)
  .map(record => ({
    case_id: record.case_id,
    decision: record.should_generate_decision,
    hypothesis_flags: [...record.hypothesis_flags].sort((a, b) => a.localeCompare(b))
  }))
  .sort((a, b) => a.case_id.localeCompare(b.case_id));

const interventionCounts = sortedCounts(records.flatMap(record => record.recommended_interventions));
const recordsWithInterventions = records.filter(record => record.recommended_interventions.length > 0).length;
const recordsWithMultipleInterventions = records.filter(record => record.recommended_interventions.length > 1).length;

const summary = {
  version: "preflight_summary_seed_v1",
  generated_by: "summarize_preflight_records_v0",
  source_file_path: inputPath,
  source_version: payload.version ?? "unknown",
  source_run_id: payload.run_id ?? "unknown",
  total_record_count: records.length,
  distributions: {
    should_generate_decision: sortedCounts(records.map(record => record.should_generate_decision)),
    confidence: sortedCounts(records.map(record => record.confidence)),
    evidence_level: sortedCounts(records.map(record => record.evidence_level)),
    risk_level: {
      status: "not_present_in_current_schema"
    },
    review_pressure: {
      status: "not_present_in_current_schema",
      proxy_fields: ["should_generate_decision", "confidence", "evidence_level", "hypothesis_flags"]
    },
    interventions: interventionCounts
  },
  top_tags: {
    detected_risk_tags: topCounts(records.flatMap(record => record.detected_risk_tags)),
    hypothesis_flags: topCounts(records.flatMap(record => record.hypothesis_flags)),
    output_failure_tags: {
      status: "not_present_in_preflight_record_schema_v0"
    }
  },
  weak_evidence: {
    record_count: recordsWithHypothesisFlags.length,
    records: recordsWithHypothesisFlags
  },
  records_by_decision: {
    generate_ok: caseIds(recordsByDecision.generate_ok),
    revise_first: caseIds(recordsByDecision.revise_first),
    needs_review: caseIds(recordsByDecision.needs_review),
    unknown: caseIds(recordsByDecision.unknown)
  },
  blocked_or_needs_review: {
    blocked_status: "blocked_decision_not_present_in_current_schema",
    needs_review: caseIds(recordsByDecision.needs_review)
  },
  calibration_watchlists: {
    potential_over_strict_candidates: potentialOverStrictCandidates,
    potential_over_permissive_candidates: potentialOverPermissiveCandidates,
    detection_notes: [
      "Over-strict candidates are detected only from record fields and reviewer-note keywords.",
      "Over-permissive candidates require generate_ok plus hypothesis flags or high-risk reviewer-note signals.",
      "These watchlists are audit aids, not validation claims."
    ]
  },
  records_requiring_human_review: humanReviewRecords,
  actionability_summary: {
    records_with_interventions: recordsWithInterventions,
    records_with_multiple_interventions: recordsWithMultipleInterventions,
    most_common_interventions: topCounts(records.flatMap(record => record.recommended_interventions), 10),
    caveat: "Interventions are categorical recommendations, not automatic rewrites."
  },
  schema_expressiveness_notes: [
    "Current records do not include explicit risk_level or review_pressure fields.",
    "Current records do not include output-side observed failure tags because no video generation trial has run.",
    "Current records do not encode seed-level should_generate labels, so over-strict detection relies on reviewer-note signals.",
    "Current records do not prove product usefulness or video output quality."
  ]
};

writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(`Wrote preflight summary for ${records.length} records to ${outputPath}`);
