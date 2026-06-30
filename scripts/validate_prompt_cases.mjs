import { readFileSync } from "node:fs";

const file = process.argv[2] ?? "data/prompt_case_seed_v0.json";
const allowedConfidence = new Set(["low", "medium", "high"]);
const allowedRiskTags = new Set([
  "too_many_subjects",
  "too_many_actions",
  "complex_camera_movement",
  "identity_reference_missing",
  "product_features_not_locked",
  "prompt_conflict",
  "too_much_story_in_one_clip",
  "no_shot_decomposition",
  "model_task_mismatch",
  "duration_too_ambitious",
  "physical_motion_risk",
  "text_logo_risk"
]);
const allowedFailureTags = new Set([
  "face_character_drift",
  "product_deformation",
  "hand_body_action_artifacts",
  "camera_not_following_prompt",
  "scene_environment_inconsistency",
  "prompt_ignored",
  "identity_style_drift",
  "unusable_for_client_delivery",
  "high_retry_cost",
  "continuity_break"
]);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

const data = JSON.parse(readFileSync(file, "utf8"));

if (data.version !== "prompt_case_seed_v0") fail("version must be prompt_case_seed_v0");
if (!Array.isArray(data.cases)) fail("cases must be an array");
if (Array.isArray(data.cases) && (data.cases.length < 8 || data.cases.length > 12)) {
  fail("seed dataset should contain 8 to 12 cases");
}

const ids = new Set();

for (const item of data.cases ?? []) {
  const label = item.id ?? "<missing id>";

  if (typeof item.id !== "string" || !/^PC-\d{3}$/.test(item.id)) fail(`${label}: id must match PC-000`);
  if (ids.has(item.id)) fail(`${label}: duplicate id`);
  ids.add(item.id);

  if (typeof item.prompt !== "string" || item.prompt.trim().length < 20) fail(`${label}: prompt is missing or too short`);
  if (!isStringArray(item.prompt_side_risk_tags) || item.prompt_side_risk_tags.length === 0) fail(`${label}: prompt_side_risk_tags must be a non-empty string array`);
  if (!isStringArray(item.expected_output_failure_tags) || item.expected_output_failure_tags.length === 0) fail(`${label}: expected_output_failure_tags must be a non-empty string array`);
  if (!isStringArray(item.evidence_ids)) fail(`${label}: evidence_ids must be a string array`);
  if (!isStringArray(item.evidence_links)) fail(`${label}: evidence_links must be a string array`);
  if (!allowedConfidence.has(item.confidence)) fail(`${label}: confidence must be low, medium, or high`);
  if (typeof item.should_generate !== "boolean") fail(`${label}: should_generate must be boolean`);
  if (typeof item.do_not_generate_yet !== "boolean") fail(`${label}: do_not_generate_yet must be boolean`);
  if (item.should_generate === item.do_not_generate_yet) fail(`${label}: should_generate and do_not_generate_yet should be opposites in v0 seed`);
  if (typeof item.notes !== "string" || item.notes.trim().length < 20) fail(`${label}: notes are missing or too short`);

  for (const tag of item.prompt_side_risk_tags ?? []) {
    if (!allowedRiskTags.has(tag)) fail(`${label}: unknown prompt_side_risk_tag ${tag}`);
  }
  for (const tag of item.expected_output_failure_tags ?? []) {
    if (!allowedFailureTags.has(tag)) fail(`${label}: unknown expected_output_failure_tag ${tag}`);
  }
}

if (process.exitCode) {
  process.exit();
}

console.log(`Validated ${data.cases.length} prompt cases from ${file}`);
