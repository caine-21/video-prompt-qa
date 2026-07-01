# Preflight Record Schema v0

## 1. Purpose

This schema defines one normalized preflight record emitted by the offline preflight harness. Its job is to make future harness runs comparable, auditable, and compatible with `docs/research/validation_protocol_v0.md`.

The record captures what the harness saw, which rubric rules it matched, what decision it made, and which weak-evidence assumptions should be audited later. It is a design contract only. It is not a JSON schema implementation and does not claim empirical validation.

## 2. Position In Architecture

```text
prompt_case_seed_v0.json
+ preflight_rubric_v0.json
-> preflight_harness_v0
-> preflight_record_schema_v0
-> future preflight_records_seed_v0.json
-> validation_protocol_v0.md
```

The record schema sits after the offline harness and before validation experiments. It turns one harness run into a stable artifact that can be compared across baseline and treatment conditions.

## 3. Record Identity Fields

- `run_id`: identifier for a harness execution batch.
- `record_id`: stable identifier for one emitted preflight record.
- `harness_version`: harness version used to create the record.
- `rubric_version`: rubric version used to map risk tags to interventions.
- `case_id`: source prompt case identifier.
- `condition`: `baseline` or `treatment`.
- `created_at`: timestamp when the record was emitted.

These fields are needed for reproducibility. They make it possible to trace a record back to the exact case, rubric, harness version, and validation condition used at creation time.

## 4. Input Snapshot Fields

- `raw_prompt`: prompt text inspected by the harness.
- `selected_model_or_tool`: intended model or video tool.
- `target_video_type`: intended use case, such as ecommerce, ad, social, product demo, or narrative clip.
- `reference_availability`: available reference assets, such as product images, character sheets, storyboards, or keyframes.
- `hard_requirements`: non-negotiable requirements, such as exact identity, product fidelity, brand marks, duration, or camera movement.
- `constraints`: additional prompt or workflow constraints supplied to the run.
- `expected_risk_tags`: optional risk tags from seed cases, when present.

These fields are snapshots of the run input. They are not mutable product state and should not be treated as user profile data, workflow memory, or production configuration.

## 5. Detection Fields

- `detected_risk_tags`: prompt-side risk tags detected by the harness.
- `matched_rule_ids`: rubric rule identifiers or risk tags matched during detection.
- `confidence`: overall confidence for the record, such as `low`, `medium`, or `high`.
- `evidence_level`: summary label such as `supported`, `partially_supported`, `workflow_supported`, or `hypothesis_heavy`.
- `hypothesis_flags`: weak-evidence or assumption-heavy tags that require separate review.
- `rationale`: concise explanation of why the harness produced this detection.

Weak-evidence tags must remain auditable and separate from validated blockers. A tag appearing in `detected_risk_tags` does not mean the tag is empirically validated.

## 6. Intervention Fields

- `recommended_interventions`: interventions mapped from the matched rubric rules.
- `intervention_priority`: ordered list or summary of which intervention should be applied first.
- `should_generate_decision`: normalized decision for the prompt before generation.

Allowed `should_generate_decision` values:

- `generate_ok`: prompt appears constrained enough to generate, while still recording known risks.
- `revise_first`: prompt should be revised before generation.
- `needs_review`: prompt requires human review because evidence is weak, requirements are ambiguous, or risks conflict.
- `unknown`: harness cannot make a reliable decision from the available inputs.

These decisions are pre-generation research labels, not production gating logic.

## 7. Validation Compatibility Fields

- `validation_group`: grouping label for validation runs, such as fixed-budget or stop-when-usable.
- `fixed_budget_ready`: whether the record has enough information for the fixed-budget experiment.
- `stop_when_usable_ready`: whether the record has enough information for the stop-when-usable experiment.
- `expected_metrics_to_compare`: metrics the later validation run should compare.
- `notes_for_reviewer`: specific caveats, audit points, or follow-up questions.

Expected metrics may include:

- Usable output yield.
- Retry count.
- Credits per usable clip.
- Revision count.
- Output-side failure tags.

These fields connect the preflight record to `docs/research/validation_protocol_v0.md`. They do not record generated video outcomes by themselves.

## 8. Conservative Handling Policy

These tags must remain conservative / hypothesis-heavy unless later evidence supports stronger treatment:

- `prompt_conflict`
- `duration_too_ambitious`
- `text_logo_risk`
- `too_many_subjects`

They should be recorded as `hypothesis_flags` or weak evidence where appropriate, not treated as empirically validated blockers. They can influence `needs_review` or contribute to `revise_first` only when paired with stronger supported risks.

## 9. Example Record

Illustrative only; this is not generated data.

```json
{
  "run_id": "run-2026-07-01-seed",
  "record_id": "pr-PC-002-treatment-v0",
  "harness_version": "preflight_harness_v0",
  "rubric_version": "preflight_rubric_v0",
  "case_id": "PC-002",
  "condition": "treatment",
  "created_at": "2026-07-01T00:00:00Z",
  "raw_prompt": "Generate a video of the same woman from three angles...",
  "selected_model_or_tool": "unspecified",
  "target_video_type": "social video",
  "reference_availability": "no reference image provided",
  "hard_requirements": ["same face", "same jacket", "three angles"],
  "constraints": ["keep identity consistent"],
  "expected_risk_tags": ["identity_reference_missing", "no_shot_decomposition"],
  "detected_risk_tags": ["identity_reference_missing", "no_shot_decomposition"],
  "matched_rule_ids": ["identity_reference_missing", "no_shot_decomposition"],
  "confidence": "medium",
  "evidence_level": "workflow_supported",
  "hypothesis_flags": [],
  "rationale": "Identity continuity is required, but no reference image or character sheet is available.",
  "recommended_interventions": ["add_reference_image", "split_into_shots"],
  "intervention_priority": ["add_reference_image", "split_into_shots"],
  "should_generate_decision": "revise_first",
  "validation_group": "stop_when_usable",
  "fixed_budget_ready": true,
  "stop_when_usable_ready": true,
  "expected_metrics_to_compare": ["retry count", "credits per usable clip", "output-side failure tags"],
  "notes_for_reviewer": "Check whether adding references reduces face_character_drift."
}
```

## 10. Non-Goals

This v0 does not include:

- JSON schema implementation.
- Runtime harness.
- UI.
- LLM judge.
- Video generation.
- Automatic prompt rewriting.
- Benchmark claims.
- Production scoring.

## 11. Future Implementation Slice

Possible next files:

- `data/preflight_record_schema_v0.json`
- `scripts/validate_preflight_record_schema.mjs`
- `scripts/run_preflight_harness.mjs`
- `data/preflight_records_seed_v0.json`

Do not implement these until the design contract is reviewed. The first implementation should remain offline, deterministic, and limited to schema validation plus seed-record generation.
