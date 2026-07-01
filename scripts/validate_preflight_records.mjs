import { readFileSync } from "node:fs";

const recordsPath = process.argv[2] ?? "data/preflight_records_seed_v0.json";
const schemaPath = process.argv[3] ?? "data/preflight_record_schema_v0.json";

function fail(message) {
  console.error(`Preflight records validation failed: ${message}`);
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

function assertEnum(record, schema, field) {
  const allowed = schema.enums?.[field];
  if (!Array.isArray(allowed)) fail(`schema enum missing for ${field}`);
  if (!allowed.includes(record[field])) {
    fail(`${record.record_id}: invalid ${field} ${record[field]}`);
  }
}

function assertContainsAll(actual, expected, label) {
  assertArray(actual, label);
  const missing = expected.filter(item => !actual.includes(item));
  if (missing.length > 0) fail(`${label} missing: ${missing.join(", ")}`);
}

const payload = readJson(recordsPath);
const schema = readJson(schemaPath);
const records = payload.records;

assertArray(records, "records");
assertArray(schema.required_fields, "schema.required_fields");

const weakTags = schema.conservative_policy?.weak_evidence_tags;
assertArray(weakTags, "schema.conservative_policy.weak_evidence_tags");

const expectedDecisionEnum = ["generate_ok", "revise_first", "needs_review", "unknown"];
const actualDecisionEnum = schema.enums?.should_generate_decision;
if (JSON.stringify(actualDecisionEnum) !== JSON.stringify(expectedDecisionEnum)) {
  fail(`schema should_generate_decision enum must be exactly ${expectedDecisionEnum.join(", ")}`);
}

const expectedMetrics = schema.enums?.expected_metrics_to_compare;
assertArray(expectedMetrics, "schema.enums.expected_metrics_to_compare");

for (const record of records) {
  const label = record.record_id ?? "<missing record_id>";

  for (const field of schema.required_fields) {
    if (!(field in record)) fail(`${label}: missing required field ${field}`);
  }

  for (const field of ["condition", "confidence", "evidence_level", "validation_group", "should_generate_decision"]) {
    assertEnum(record, schema, field);
  }

  for (const field of [
    "expected_risk_tags",
    "detected_risk_tags",
    "matched_rule_ids",
    "hypothesis_flags",
    "recommended_interventions",
    "intervention_priority",
    "expected_metrics_to_compare"
  ]) {
    assertArray(record[field], `${label}.${field}`);
  }

  const missingWeakFlags = record.detected_risk_tags
    .filter(tag => weakTags.includes(tag))
    .filter(tag => !record.hypothesis_flags.includes(tag));
  if (missingWeakFlags.length > 0) {
    fail(`${label}: weak-evidence tags missing from hypothesis_flags: ${missingWeakFlags.join(", ")}`);
  }

  assertContainsAll(record.expected_metrics_to_compare, expectedMetrics, `${label}.expected_metrics_to_compare`);
}

console.log(`Validated ${records.length} preflight records from ${recordsPath} against ${schemaPath}`);
