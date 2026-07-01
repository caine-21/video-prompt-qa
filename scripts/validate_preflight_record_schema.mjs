import { readFileSync } from "node:fs";

const file = process.argv[2] ?? "data/preflight_record_schema_v0.json";

const requiredTopLevel = [
  "schema_name",
  "schema_version",
  "record_type",
  "required_fields",
  "field_groups",
  "enums",
  "conservative_policy"
];

const requiredIdentityFields = [
  "run_id",
  "record_id",
  "harness_version",
  "rubric_version",
  "case_id",
  "condition",
  "created_at"
];

const expectedDecisionEnum = [
  "generate_ok",
  "revise_first",
  "needs_review",
  "unknown"
];

const conservativeTags = [
  "prompt_conflict",
  "duration_too_ambitious",
  "text_logo_risk",
  "too_many_subjects"
];

const expectedMetrics = [
  "usable_output_yield",
  "retry_count",
  "credits_per_usable_clip",
  "revision_count",
  "output_side_failure_tags"
];

function fail(message) {
  console.error(`Schema validation failed: ${message}`);
  process.exit(1);
}

function assertArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
}

function assertContainsAll(actual, expected, label) {
  assertArray(actual, label);
  const missing = expected.filter(item => !actual.includes(item));
  if (missing.length > 0) fail(`${label} missing: ${missing.join(", ")}`);
}

function assertExactArray(actual, expected, label) {
  assertArray(actual, label);
  const extra = actual.filter(item => !expected.includes(item));
  const missing = expected.filter(item => !actual.includes(item));
  if (missing.length > 0 || extra.length > 0 || actual.length !== expected.length) {
    fail(`${label} must be exactly [${expected.join(", ")}]; missing=[${missing.join(", ")}], extra=[${extra.join(", ")}]`);
  }
}

let schema;
try {
  schema = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  fail(`could not read or parse ${file}: ${error instanceof Error ? error.message : String(error)}`);
}

for (const key of requiredTopLevel) {
  if (!(key in schema)) fail(`missing top-level key ${key}`);
}

if (schema.schema_name !== "preflight_record_schema") fail("schema_name must be preflight_record_schema");
if (schema.schema_version !== "v0") fail("schema_version must be v0");
if (schema.record_type !== "preflight_record") fail("record_type must be preflight_record");

assertContainsAll(schema.required_fields, requiredIdentityFields, "required_fields");

if (!schema.field_groups || typeof schema.field_groups !== "object" || Array.isArray(schema.field_groups)) {
  fail("field_groups must be an object");
}

const identityGroup = schema.field_groups.identity_reproducibility;
if (!identityGroup) fail("field_groups.identity_reproducibility is required");
assertContainsAll(identityGroup.required, requiredIdentityFields, "field_groups.identity_reproducibility.required");

for (const groupName of ["input_snapshot", "detection_output", "intervention_output", "validation_compatibility"]) {
  const group = schema.field_groups[groupName];
  if (!group) fail(`field_groups.${groupName} is required`);
  assertArray(group.required, `field_groups.${groupName}.required`);
}

if (!schema.enums || typeof schema.enums !== "object" || Array.isArray(schema.enums)) {
  fail("enums must be an object");
}

assertExactArray(schema.enums.should_generate_decision, expectedDecisionEnum, "enums.should_generate_decision");
assertContainsAll(schema.enums.expected_metrics_to_compare, expectedMetrics, "enums.expected_metrics_to_compare");

const policy = schema.conservative_policy;
if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
  fail("conservative_policy must be an object");
}

if (policy.preserve_weak_evidence_separately !== true) {
  fail("conservative_policy.preserve_weak_evidence_separately must be true");
}
if (policy.do_not_encode_as_validated_blockers !== true) {
  fail("conservative_policy.do_not_encode_as_validated_blockers must be true");
}

assertContainsAll(policy.weak_evidence_tags, conservativeTags, "conservative_policy.weak_evidence_tags");

console.log(`Validated ${schema.schema_name} ${schema.schema_version} from ${file}`);
