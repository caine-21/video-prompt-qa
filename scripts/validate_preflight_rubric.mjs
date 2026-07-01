import { readFileSync } from "node:fs";

const file = process.argv[2] ?? "data/preflight_rubric_v0.json";

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
const allowedConfidence = new Set(["low", "medium", "high"]);
const allowedImpact = new Set(["allow", "warn", "revise_first", "do_not_generate_yet"]);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

const data = JSON.parse(readFileSync(file, "utf8"));

if (data.version !== "preflight_rubric_v0") fail("version must be preflight_rubric_v0");
if (!Array.isArray(data.rules)) fail("rules must be an array");

const seen = new Set();

for (const rule of data.rules ?? []) {
  const label = rule.risk_tag ?? "<missing risk_tag>";

  if (!allowedRiskTags.has(rule.risk_tag)) fail(`${label}: unknown risk_tag`);
  if (seen.has(rule.risk_tag)) fail(`${label}: duplicate rule`);
  seen.add(rule.risk_tag);

  if (typeof rule.detection_hint !== "string" || rule.detection_hint.length < 20) fail(`${label}: detection_hint is missing or too short`);
  if (!allowedConfidence.has(rule.confidence)) fail(`${label}: confidence must be low, medium, or high`);
  if (!isStringArray(rule.likely_failure_tags) || rule.likely_failure_tags.length === 0) fail(`${label}: likely_failure_tags must be a non-empty string array`);
  if (typeof rule.suggested_intervention !== "string" || rule.suggested_intervention.length < 5) fail(`${label}: suggested_intervention is missing or too short`);
  if (!allowedImpact.has(rule.should_generate_impact)) fail(`${label}: should_generate_impact is invalid`);
  if (!isStringArray(rule.evidence_ids)) fail(`${label}: evidence_ids must be a string array`);
  if (typeof rule.notes !== "string" || rule.notes.length < 20) fail(`${label}: notes are missing or too short`);

  for (const tag of rule.likely_failure_tags) {
    if (!allowedFailureTags.has(tag)) fail(`${label}: unknown likely_failure_tag ${tag}`);
  }
}

for (const tag of allowedRiskTags) {
  if (!seen.has(tag)) fail(`missing rule for ${tag}`);
}

if (process.exitCode) {
  process.exit();
}

console.log(`Validated ${data.rules.length} preflight rubric rules from ${file}`);
