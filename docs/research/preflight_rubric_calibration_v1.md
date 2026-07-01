# Preflight Rubric Calibration v1

## Purpose And Scope

This note reviews whether the expanded 36-case seed set supports changing `data/preflight_rubric_v0.json` or whether the rubric should remain frozen until generation trials and creator behavior evidence exist.

Scope is limited to docs/data/scripts. This is not UI work, product logic, model integration, video generation, or empirical product validation.

## Inputs Reviewed

- `data/prompt_case_seed_v1.json`
- `data/prompt_case_seed_v0.json`
- `data/preflight_records_seed_v1.json`
- `data/preflight_records_seed_v0.json`
- `data/preflight_record_schema_v0.json`
- `data/preflight_rubric_v0.json`
- `docs/research/preflight_harness_calibration_v0.md`
- `docs/research/seed_case_expansion_v1.md`
- `docs/research/failure_taxonomy_v0.md`
- `docs/research/validation_protocol_v0.md`
- `scripts/run_preflight_harness.mjs`
- `scripts/validate_prompt_cases.mjs`
- `scripts/validate_preflight_records.mjs`
- `scripts/validate_preflight_rubric.mjs`
- `scripts/validate_preflight_record_schema.mjs`

## Harness Compatibility

`scripts/run_preflight_harness.mjs` required a minimal compatibility update. The original script was hard-coded to:

- `data/prompt_case_seed_v0.json`
- `data/preflight_records_seed_v0.json`
- `preflight_seed_v0`
- `preflight_records_seed_v0`

The update keeps the v0 defaults intact and adds optional CLI paths:

```powershell
node scripts/run_preflight_harness.mjs data/prompt_case_seed_v1.json data/preflight_records_seed_v1.json
```

The harness still uses the same deterministic mapping from seed risk annotations to rubric rules. It does not add NLP, LLM judging, API calls, autonomous behavior, or semantic risk inference.

## v1 Generated Record Distribution

Total generated records: 36.

`should_generate_decision` distribution:

- `needs_review`: 21
- `revise_first`: 15
- `generate_ok`: 0
- `unknown`: 0

`confidence` distribution:

- `medium`: 17
- `low`: 19
- `high`: 0

`evidence_level` distribution:

- `workflow_supported`: 1
- `partially_supported`: 34
- `hypothesis_heavy`: 1
- `supported`: 0
- `unknown`: 0

Weak-evidence / hypothesis flag count:

- Records with `hypothesis_flags`: 18 of 36.

Intervention distribution:

| intervention | count |
|---|---:|
| `generate_image_keyframe_first` | 26 |
| `simplify_prompt` | 25 |
| `split_into_shots` | 24 |
| `reduce_simultaneous_constraints` | 24 |
| `add_reference_image` | 22 |
| `lock_product_attributes` | 19 |
| `create_storyboard_first` | 17 |
| `reduce_camera_complexity` | 7 |
| `do_not_generate_yet` | 6 |
| `choose_better_model_task_mode` | 5 |

The record schema does not include explicit `risk_level` or `review_pressure` fields. In this review, `should_generate_decision`, `confidence`, `evidence_level`, and `hypothesis_flags` are used as review-pressure proxies.

## Over-Strict Candidates

The main v1 finding is over-strictness on safe or likely safe seed cases. All 13 `should_generate: true` cases were escalated to either `revise_first` or `needs_review`.

| case_id | current decision | why it looks over-strict |
|---|---|---|
| PC-007 | `revise_first` | Prepared keyframe, static product, and a single slow push-in. |
| PC-009 | `revise_first` | One storyboard panel, one robot-hand action, static camera. |
| PC-012 | `revise_first` | Product reference, one simple pan, no people, no text requirement. |
| PC-016 | `needs_review` | Style ambiguity is exploratory and hypothesis-heavy, not necessarily a blocker. |
| PC-018 | `revise_first` | One candle, static camera, product photo, no text or people. |
| PC-021 | `revise_first` | Simple product slide with reference and static camera. |
| PC-023 | `revise_first` | Hands add risk, but the action is constrained and short. |
| PC-025 | `revise_first` | Macro watch shot with product reference and one turntable move. |
| PC-027 | `revise_first` | One constrained unboxing action with supplied reference. |
| PC-029 | `revise_first` | One reach-in action, no face, static camera, product reference. |
| PC-032 | `revise_first` | Simple locked-off product shot with gentle steam. |
| PC-034 | `revise_first` | Non-critical cafe ambience clip; product fidelity is mild. |
| PC-036 | `revise_first` | Single product, provided image, one slow push-in, no text requirement. |

This pattern is real, but it does not yet justify a rubric v1 change. The seed schema currently requires at least one risk tag, so safe-pass cases are represented with mild versions of tags such as `product_features_not_locked` and `physical_motion_risk`. The rubric cannot tell from the tag alone whether the case has a provided reference, static camera, low product fidelity pressure, or a simple action.

## Over-Permissive Candidates

No risky case produced `generate_ok`.

Potentially risky cases such as PC-017, PC-020, PC-028, PC-033, and PC-035 all remained `needs_review`. The current rubric is conservative rather than permissive.

## Ambiguous Cases

These cases should not trigger immediate rule changes:

- PC-016: `prompt_conflict` only. This is hypothesis-heavy and may be acceptable as an exploratory style prompt.
- PC-023, PC-027, PC-029, PC-032: simple physical-motion or steam cases. These may be safe, but generation trials are needed before weakening `physical_motion_risk`.
- PC-007, PC-012, PC-018, PC-021, PC-025, PC-034, PC-036: product-reference cases. They suggest the need for a future reference-availability or risk-severity distinction, not a blunt downgrade of `product_features_not_locked`.
- PC-017 and PC-033: regulated or brand-sensitive prompts. The current taxonomy lacks a dedicated safety/legal/claims tag, so these should remain review-oriented but should not be treated as fully solved by the existing rubric.

## Weak-Evidence Behavior

Weak-evidence tags are preserved in `hypothesis_flags` when present:

- `prompt_conflict`
- `duration_too_ambitious`
- `text_logo_risk`
- `too_many_subjects`

The 36-case expansion produced 18 records with hypothesis flags. These flags affect review pressure when combined with stronger risks, but they remain auditable and are not treated as empirically validated blockers.

One notable behavior remains from v0: `warn` and `do_not_generate_yet` rubric impacts both map to `needs_review` in the normalized record decision. This keeps output conservative, but it also means weak or exploratory tags can escalate a case more strongly than a human reviewer might expect. That is a calibration concern, not a schema failure.

## Comparison With Phase 1 Calibration

Phase 1 already identified possible over-strictness for PC-007 and PC-009. The expanded seed confirms that the pattern repeats across many safe-pass product/reference and constrained-motion cases.

New patterns from the 36-case expansion:

- Safe product-reference prompts are consistently escalated because `product_features_not_locked` always maps to `revise_first`.
- Simple physical-motion prompts are consistently escalated because `physical_motion_risk` maps to `revise_first`.
- Style ambiguity can escalate to `needs_review` because `prompt_conflict` is mapped as `warn`, and the harness normalizes `warn` to `needs_review`.
- Regulated, policy-sensitive, or brand-sensitive prompts are not directly represented in the taxonomy; they are approximated through `model_task_mismatch`, `text_logo_risk`, `too_many_subjects`, and delivery-risk failure tags.

These are useful calibration findings, but they point more toward future schema/taxonomy expressiveness than an immediate rubric v1.

## Schema, Protocol, And Product Usefulness

- Schema-valid: validators pass and records conform to `data/preflight_record_schema_v0.json`.
- Protocol-aligned: records are usable as validation inputs and follow the intended preflight validation protocol.
- Product-useful: not proven yet. Product usefulness still requires generation trials and creator behavior evidence.

The v1 generated records can be schema-valid and protocol-aligned without proving that the rubric is product-useful. They should not be used as product validation claims.

## Recommendation

Keep `data/preflight_rubric_v0.json` frozen for now. Do not create `data/preflight_rubric_v1.json` in Phase 3.

Reasoning:

- The expanded seed reveals over-strict behavior, but the cause is not clearly a single evidence-backed rule error.
- The current seed format cannot distinguish mild versus severe instances of the same risk tag.
- Safe-pass cases often include references or tight constraints, but those inputs are only expressed in prompt text and notes, not structured fields consumed by the deterministic harness.
- Weak-evidence tags are preserved correctly and should remain conservative until generation trials or creator behavior evidence exist.

Recommended Phase 4:

- Add a v1 calibration/audit layer that records reviewer labels such as `over_strict`, `reasonable`, `over_permissive`, and `needs_generation_trial`.
- Consider structured seed fields for `reference_availability`, `risk_severity`, `target_video_type`, and `review_reason` before changing rubric impacts.
- Keep runtime/harness logic frozen unless the next slice explicitly adds these structured fields.
- Use generation trials to test whether simple product-reference and constrained-motion cases should become `generate_ok` or remain `revise_first`.

## Commands Run

```powershell
node scripts/run_preflight_harness.mjs data/prompt_case_seed_v1.json data/preflight_records_seed_v1.json
node scripts/validate_prompt_cases.mjs data/prompt_case_seed_v1.json
node scripts/validate_prompt_cases.mjs data/prompt_case_seed_v0.json
node scripts/validate_preflight_records.mjs data/preflight_records_seed_v0.json data/preflight_record_schema_v0.json
node scripts/validate_preflight_rubric.mjs data/preflight_rubric_v0.json
node scripts/validate_preflight_record_schema.mjs data/preflight_record_schema_v0.json
node scripts/validate_preflight_records.mjs data/preflight_records_seed_v1.json data/preflight_record_schema_v0.json
```
