import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateSemanticCases,
  matchSemanticFindings,
  validateSemanticDataset
} from "../../lib/preflight/semantic-evaluation.ts";
import {
  buildSemanticProviderInput,
  SEMANTIC_SYSTEM_PROMPT
} from "../../lib/preflight/semantic-providers.ts";

const expectedConflict = {
  finding_id: "expected-conflict",
  category: "conflict",
  severity: "high",
  description: "A locked camera cannot orbit around the subject in the same shot.",
  preventable: true,
  evidence_span: "locked camera that orbits 360 degrees",
  acceptable_alternatives: ["locked camera conflicts with an orbit"],
  meaning_keywords: ["locked", "camera", "orbit"],
  label_confidence: "high",
  label_provenance: "agent_authored_pre_model_v1"
};

const predictedConflict = {
  id: "predicted-conflict",
  type: "SEMANTIC_CONFLICT",
  severity: "HIGH",
  confidence: "HIGH",
  summary: "The requested camera behaviors are mutually exclusive.",
  evidence_excerpt: "locked camera that orbits 360 degrees",
  preventability: "PREVENTABLE",
  risk_pattern_ids: [],
  recommended_action: "Choose either a static camera or an orbit."
};

test("semantic findings match by category, grounded evidence, and meaning rather than exact wording", () => {
  const result = matchSemanticFindings(
    "Show a product with a locked camera that orbits 360 degrees around it.",
    [expectedConflict],
    [predictedConflict]
  );

  assert.equal(result.counts.true_positive, 1);
  assert.equal(result.counts.false_positive, 0);
  assert.equal(result.counts.false_negative, 0);
  assert.equal(result.expected[0].status, "MATCHED");
  assert.equal(result.predicted[0].prompt_supported, true);
  assert.match(result.expected[0].reason, /category.*evidence.*meaning/i);
});

test("provider failures are excluded from semantic denominators instead of counted as misses", () => {
  const cases = [{
    eval_case_id: "INFRA-1",
    split: "DEV",
    source_case_id: null,
    prompt: "Show a product with a locked camera that orbits 360 degrees around it.",
    safe_prompt: false,
    slice_tags: ["conflict"],
    expected_findings: [expectedConflict]
  }];
  const results = [{
    eval_case_id: "INFRA-1",
    status: "INFRA_ERROR",
    predictions: [],
    structured_output_valid: false,
    errors: [{ domain: "INFRA_ERROR", code: "TIMEOUT", message: "deadline", retryable: false }]
  }];

  const evaluation = evaluateSemanticCases(cases, results);
  assert.equal(evaluation.provider_failures.count, 1);
  assert.equal(evaluation.finding_metrics.denominator_cases, 0);
  assert.equal(evaluation.finding_metrics.false_negative, 0);
  assert.equal(evaluation.structured_output_validity.denominator, 1);
  assert.equal(evaluation.structured_output_validity.numerator, 0);
});

test("safe prompts with a spurious blocking finding count toward safe false positives", () => {
  const cases = [{
    eval_case_id: "SAFE-1",
    split: "HOLDOUT",
    source_case_id: null,
    prompt: "One ceramic mug on a table with a locked camera and soft daylight.",
    safe_prompt: true,
    slice_tags: ["safe"],
    expected_findings: []
  }];
  const results = [{
    eval_case_id: "SAFE-1",
    status: "OK",
    predictions: [{
      ...predictedConflict,
      evidence_excerpt: "locked camera",
      summary: "The locked camera is risky."
    }],
    structured_output_valid: true,
    errors: []
  }];

  const evaluation = evaluateSemanticCases(cases, results);
  assert.equal(evaluation.safe_false_positive_rate.numerator, 1);
  assert.equal(evaluation.safe_false_positive_rate.denominator, 1);
  assert.equal(evaluation.finding_metrics.false_positive, 1);
});

test("the frozen dataset keeps labels independent and both splits cover required slices", async () => {
  const dataset = JSON.parse(await (await import("node:fs/promises")).readFile(
    new URL("../../data/semantic_eval_dataset_v1.json", import.meta.url),
    "utf8"
  ));
  const validation = validateSemanticDataset(dataset);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  assert.deepEqual(validation.split_counts, { DEV: 14, HOLDOUT: 14 });
  assert.deepEqual(validation.safe_counts, { DEV: 4, HOLDOUT: 3 });
});

test("the provider boundary excludes benchmark labels and case metadata", () => {
  const providerInput = buildSemanticProviderInput({
    prompt: "A coherent product shot with a locked camera and stable soft light.",
    target_model: "veo-3.1-generate-001",
    duration: 4,
    aspect_ratio: "16:9",
    mode: "text-to-video",
    references: [],
    hard_constraints: ["locked camera"]
  });
  assert.deepEqual(Object.keys(providerInput), ["prompt"]);
  assert.equal("eval_case_id" in providerInput, false);
  assert.equal("expected_findings" in providerInput, false);
  assert.doesNotMatch(SEMANTIC_SYSTEM_PROMPT, /SEM-(DEV|HOLDOUT)-\d+/);
});
