import { readFileSync } from "node:fs";
import { validateSemanticDataset } from "../lib/preflight/semantic-evaluation.ts";
import {
  DEEPSEEK_SEMANTIC_MODEL,
  SEMANTIC_OUTPUT_SCHEMA_VERSION,
  SEMANTIC_PROMPT_VERSION,
  SEMANTIC_SYSTEM_PROMPT_VERSION
} from "../lib/preflight/semantic-providers.ts";

const dataset = JSON.parse(readFileSync("data/semantic_eval_dataset_v1.json", "utf8"));
const manifest = JSON.parse(readFileSync("data/semantic_eval_manifest_v1.json", "utf8"));
const contaminationAudit = JSON.parse(readFileSync("data/benchmark_contamination_audit_v1.json", "utf8"));
const promptHistory = JSON.parse(readFileSync("data/semantic_prompt_history_v1.json", "utf8"));

const validation = validateSemanticDataset(dataset);
const errors = [...validation.errors];
const expectedConfig = {
  provider_mode: "SINGLE_PROVIDER",
  provider: "deepseek",
  model: DEEPSEEK_SEMANTIC_MODEL,
  temperature: 0,
  system_prompt_version: SEMANTIC_SYSTEM_PROMPT_VERSION,
  semantic_prompt_version: SEMANTIC_PROMPT_VERSION,
  semantic_output_schema_version: SEMANTIC_OUTPUT_SCHEMA_VERSION,
  timeout_ms: 12_000,
  max_provider_calls_per_case: 1,
  retry_limit: 0,
  fallback_enabled: false
};

for (const [key, expected] of Object.entries(expectedConfig)) {
  if (JSON.stringify(manifest.frozen_config[key]) !== JSON.stringify(expected)) {
    errors.push(`Manifest ${key} must equal ${JSON.stringify(expected)}.`);
  }
}
if (manifest.frozen_config.semantic_detection_tools.length !== 0) {
  errors.push("Semantic detection must expose zero tools.");
}
if (manifest.holdout_policy.allowed_prompt_tuning_split !== "DEV") {
  errors.push("Prompt tuning must be restricted to DEV.");
}
if (promptHistory.versions.length > promptHistory.max_substantive_versions || promptHistory.max_substantive_versions > 3) {
  errors.push("Prompt history exceeds the three-version tuning budget.");
}
if (!contaminationAudit.sources.some((item) => item.severity === "CRITICAL")) {
  errors.push("Contamination audit must identify critical leakage boundaries.");
}

const result = {
  valid: errors.length === 0,
  dataset: validation,
  frozen_config_matches_runtime: errors.filter((item) => item.startsWith("Manifest ")).length === 0,
  contamination_audit_version: contaminationAudit.version,
  prompt_versions_used: promptHistory.versions.length,
  errors
};

console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
