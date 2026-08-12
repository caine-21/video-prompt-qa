import assert from "node:assert/strict";
import test from "node:test";
import {
  PREFLIGHT_TOOL_CONTRACTS,
  checkProtectedConstraints,
  getModelCapabilities,
  retrieveFailurePatterns,
  validateGenerationParameters
} from "../../lib/preflight/tools.ts";

test("Gate 1 exposes exactly four deterministic typed tool contracts", () => {
  assert.deepEqual(Object.keys(PREFLIGHT_TOOL_CONTRACTS).sort(), [
    "check_protected_constraints",
    "get_model_capabilities",
    "retrieve_failure_patterns",
    "validate_generation_parameters"
  ]);
  for (const contract of Object.values(PREFLIGHT_TOOL_CONTRACTS)) {
    assert.equal(contract.deterministic, true);
    assert.equal(typeof contract.input_schema.safeParse, "function");
    assert.equal(typeof contract.output_schema.safeParse, "function");
    assert.ok(contract.possible_errors.length > 0);
  }
});

test("tool outputs satisfy their declared runtime schemas", () => {
  const capabilities = getModelCapabilities({ target_model: "benchmark-generic-video-v1" });
  const request = {
    prompt: "One ceramic mug on a table, locked camera, soft daylight, no text.",
    target_model: "benchmark-generic-video-v1",
    duration: 5,
    aspect_ratio: "16:9",
    mode: "text-to-video",
    references: [],
    hard_constraints: ["locked camera"]
  };

  const outputs = {
    get_model_capabilities: capabilities,
    validate_generation_parameters: validateGenerationParameters({ request, capabilities }),
    retrieve_failure_patterns: retrieveFailurePatterns({ risk_pattern_ids: ["prompt_conflict", "not-in-catalog"] }),
    check_protected_constraints: checkProtectedConstraints({
      original_prompt: request.prompt,
      candidate_prompt: "One mug in daylight.",
      hard_constraints: request.hard_constraints
    })
  };

  for (const [name, output] of Object.entries(outputs)) {
    assert.equal(PREFLIGHT_TOOL_CONTRACTS[name].output_schema.safeParse(output).success, true);
  }
});

test("the verified Veo 3.1 slice enforces its discrete duration contract", () => {
  const capabilities = getModelCapabilities({ target_model: "veo-3.1-generate-001" });
  assert.equal(capabilities.status, "FOUND");
  assert.equal(capabilities.capability.evidence_status, "VERIFIED");
  assert.deepEqual(capabilities.capability.duration_seconds.allowed_values, [4, 6, 8]);
  assert.ok(capabilities.capability.sources[0].reference.startsWith("https://docs.cloud.google.com/"));

  const invalid = validateGenerationParameters({
    request: {
      prompt: "One ceramic mug on a table, locked camera, soft daylight, no text.",
      target_model: "veo-3.1-generate-001",
      duration: 5,
      aspect_ratio: "16:9",
      mode: "text-to-video",
      references: [],
      hard_constraints: []
    },
    capabilities
  });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.issues[0].id, "duration-value-unsupported");
});
