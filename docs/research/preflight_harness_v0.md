# Preflight Harness v0

## 1. Purpose

The preflight harness is an offline workflow system, not an autonomous agent. Its job is to make the preflight rubric testable before UI, model integration, or product MVP work.

The harness takes one prompt case and one rubric version, applies deterministic rubric rules, and emits one normalized preflight record that can later be used by validation runs. It does not generate video, call models, rewrite prompts automatically, or claim that the rubric is empirically validated.

## 2. Position In The Project Architecture

```text
product_discovery / pain_evidence
-> failure_taxonomy
-> prompt_case_seed
-> preflight_rubric
-> preflight_harness
-> preflight_record
-> validation_protocol
```

The harness sits between the research artifacts and validation protocol. It turns static cases and rubric rules into consistent records that reviewers can inspect before any product behavior is implemented.

## 3. Inputs

Minimum input contract:

- `case_id`: stable prompt case identifier.
- `raw_prompt`: prompt text to inspect before generation.
- `selected_model_or_tool`: model or video tool intended for the run.
- `target_video_type`: intended use, such as ecommerce, ad, social, product demo, or narrative clip.
- `reference_availability`: whether reference images, product assets, character sheets, storyboards, or keyframes are available.
- `hard_requirements`: non-negotiable constraints, such as exact product shape, brand mark, face identity, duration, camera movement, or delivery requirement.
- `rubric_version`: rubric identifier, such as `preflight_rubric_v0`.
- `expected_risk_tags`: optional seed-case risk tags when the input comes from `data/prompt_case_seed_v0.json`.

## 4. Processing Pipeline

The v0 harness should use a deterministic flow:

1. Load prompt case.
2. Load rubric.
3. Identify candidate prompt-side risk tags.
4. Map tags to rubric interventions.
5. Assign confidence and evidence level.
6. Mark hypothesis-heavy flags separately.
7. Decide one of:
   - `generate_ok`
   - `revise_first`
   - `needs_review`
   - `unknown`
8. Emit one normalized preflight record.

The harness should prefer conservative handling when multiple tags disagree. Supported risks can justify `revise_first`; hypothesis-heavy risks should usually become `needs_review` or a warning unless paired with stronger evidence.

## 5. Output Record Shape

Proposed normalized record shape, described in Markdown only:

- `run_id`: stable run identifier for this harness execution.
- `harness_version`: harness version, such as `preflight_harness_v0`.
- `rubric_version`: rubric version used for the decision.
- `case_id`: source prompt case identifier.
- `condition`: `baseline` or `treatment`.
- `detected_risk_tags`: list of risk tags applied by the harness.
- `recommended_interventions`: list of rubric interventions mapped from detected tags.
- `should_generate_decision`: one of `generate_ok`, `revise_first`, `needs_review`, or `unknown`.
- `confidence`: overall confidence for the preflight record.
- `evidence_level`: summary of whether the decision is supported, partially supported, workflow-supported, or hypothesis-heavy.
- `rationale`: short explanation of the decision.
- `hypothesis_flags`: weak or assumption-heavy tags that should be audited separately.
- `created_at`: timestamp for the harness run.

This is not a JSON schema yet. The shape is a design contract for reviewer discussion and future implementation.

## 6. Validation Compatibility

The preflight record should connect directly to `docs/research/validation_protocol_v0.md`.

For fixed-budget experiments, records should make it possible to compare usable output yield under the same credit budget. The record should preserve the detected risk tags, interventions, and `should_generate_decision` so reviewers can compare baseline and treatment prompts.

For stop-when-usable experiments, records should make it possible to compare retries, credits per usable clip, and revision count. The preflight record is not the generated-output result; it is the pre-generation decision record that later output annotations can reference.

The harness must preserve weak-evidence and hypothesis-heavy tags so they can be audited separately. It should avoid treating weak evidence as validated blockers.

## 7. Conservative Policy

The harness must not overclaim. These tags should remain conservative unless later evidence supports stronger treatment:

- `prompt_conflict`
- `duration_too_ambitious`
- `text_logo_risk`
- `too_many_subjects`

In v0, these tags should usually produce warnings or `needs_review`, not automatic blocking. They may contribute to `revise_first` only when combined with stronger supported risks such as identity-reference gaps, product fidelity requirements, complex action, or missing shot decomposition.

## 8. Non-Goals

This v0 does not include:

- UI.
- Video generation.
- Autonomous agent behavior.
- LLM judge.
- Benchmark claims.
- Production scoring.
- Automatic prompt rewriting.

## 9. Future Implementation Slice

A later code slice could add:

- `scripts/run_preflight_harness.mjs`
- Input: `data/prompt_case_seed_v0.json` + `data/preflight_rubric_v0.json`
- Output: `data/preflight_records_seed_v0.json`

That implementation should remain offline and deterministic until the validation protocol shows that the rubric is useful enough to connect to product logic.
