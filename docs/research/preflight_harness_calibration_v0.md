# Preflight Harness Calibration v0

## Purpose

This note reviews the 10 generated preflight records in `data/preflight_records_seed_v0.json` before any UI, runtime product logic, LLM/API integration, or MVP work. It assesses whether the current rubric, record schema, and harness output behavior are reasonable enough to keep frozen for the next validation-design step.

This is analysis only. It is not empirical validation.

## Inputs Reviewed

- `data/preflight_records_seed_v0.json`
- `data/preflight_record_schema_v0.json`
- `data/prompt_case_seed_v0.json`
- `data/preflight_rubric_v0.json`
- `docs/research/validation_protocol_v0.md`
- `scripts/run_preflight_harness.mjs`
- `scripts/validate_preflight_records.mjs`
- `docs/research/preflight_harness_seed_audit_v0.md`

## Distribution Summary

`should_generate_decision` distribution:

- `needs_review`: 6
- `revise_first`: 4
- `generate_ok`: 0
- `unknown`: 0

`evidence_level` distribution:

- `workflow_supported`: 1
- `partially_supported`: 9

The current record schema does not include explicit `risk_level` or `review_pressure` fields. In this review, `should_generate_decision`, `confidence`, `evidence_level`, and `hypothesis_flags` are used as the practical review-pressure proxy.

## Intervention Type Summary

Common intervention families:

- Prompt simplification: `simplify_prompt`, `reduce_simultaneous_constraints`
- Shot planning: `split_into_shots`, `create_storyboard_first`
- Reference preparation: `add_reference_image`, `generate_image_keyframe_first`
- Product fidelity preparation: `lock_product_attributes`
- Camera simplification: `reduce_camera_complexity`
- Model/tool review: `choose_better_model_task_mode`, `do_not_generate_yet`

The interventions are generally actionable at the category level. They tell the reviewer what kind of change is needed before generation. They are not yet specific rewrites, which is acceptable for v0 because the harness is not supposed to implement automatic prompt rewriting.

## Weak-Evidence Handling

Weak-evidence tags are preserved correctly in `hypothesis_flags`:

- PC-003: `text_logo_risk`
- PC-004: `prompt_conflict`
- PC-005: `duration_too_ambitious`, `too_many_subjects`
- PC-006: `too_many_subjects`
- PC-008: `text_logo_risk`
- PC-010: `duration_too_ambitious`

These tags materially affect decision pressure when combined with stronger tags, but they are not recorded as empirically validated blockers. This aligns with the conservative policy in the schema and rubric.

## Over-Strict Candidates

- PC-002: `needs_review` may be stricter than necessary. The case has `identity_reference_missing`, which maps to a severe rubric impact, but the actionable path is clear: add reference image / character sheet and split shots. `revise_first` might be enough if the policy treats missing references as a normal prompt-revision issue rather than a human-review issue.
- PC-007: `revise_first` may be strict for a lower-risk contrast case. The prompt already mentions a prepared keyframe, a static product, and a single slow push-in. It still carries product-fidelity risk, but this could be a future candidate for `generate_ok` or `warn` once low-risk contrast behavior is better represented.
- PC-009: `revise_first` may be strict for a constrained physical-motion case. The prompt isolates one action, uses a static camera, and references one storyboard panel. The physical-motion risk is real, but the current output may over-penalize all physical-motion tags equally.

No immediate runtime change is required because these are calibration questions, not schema failures.

## Over-Permissive Candidates

No record currently outputs `generate_ok`, so there are no direct over-permissive `generate_ok` cases.

The main permissiveness risk is different: PC-003 and PC-008 include `text_logo_risk`, exact product/client-like fidelity, and potential delivery risk, but still output `revise_first` or `needs_review` rather than a distinct `do_not_generate_yet` machine decision. This is not a schema violation because `do_not_generate_yet` is an intervention string, not a normalized record decision. It may deserve review later if validation shows that exact text/logo/package prompts are consistently wasteful without stronger references or tool choice.

## Protocol Alignment

The records align with `validation_protocol_v0.md` in these ways:

- They preserve baseline/treatment comparability fields through `condition`, metrics, and validation readiness.
- They keep hypothesis-heavy tags audit-visible.
- They avoid claiming validation or model performance.
- They provide enough pre-generation decision data for fixed-budget and stop-when-usable experiments.

Potential protocol tension:

- The harness emits only `treatment` records. That is acceptable for a seed preflight run, but fixed-budget validation will eventually need paired baseline records or an explicit baseline condition strategy.
- `recommended_interventions` are categorical, not concrete prompt edits. This is acceptable for rubric calibration, but future validation may need a human-applied treatment prompt to measure usable output yield.

## Schema, Protocol, And Product Usefulness

- Schema-valid: validators pass and records conform to `data/preflight_record_schema_v0.json`.
- Protocol-aligned: records are usable as validation inputs and follow the intended preflight validation protocol.
- Product-useful: not proven yet. Product usefulness still requires generation trials and creator behavior evidence.

The current records can be schema-valid and protocol-aligned without proving product usefulness. They should not be treated as product-useful proof until validation runs show better usable output yield, lower retry cost, or clearer creator behavior changes on recorded cases.

## Calibration Table

| case_id | current decision | risk / pressure summary | main evidence | calibration verdict | notes |
|---|---|---|---|---|---|
| PC-001 | `revise_first` | High action/camera/physics pressure; no hypothesis flags. | E-001, E-003, E-011, E-014, E-032 | keep | The decision is reasonable. Split shots and reduce camera/action complexity before generation. |
| PC-002 | `needs_review` | Identity continuity and missing reference pressure. | E-004, E-027, E-030 | maybe adjust later | Could become `revise_first` if missing identity reference is treated as a normal revision, not review escalation. |
| PC-003 | `revise_first` | Product fidelity + text/logo + motion; weak `text_logo_risk`. | E-010, E-013, E-022, E-030 | investigate | Actionable, but exact logo/text may need stronger pause behavior after generation trials. |
| PC-004 | `needs_review` | Prompt conflict hypothesis + camera complexity. | taxonomy hypothesis plus camera workflow evidence | keep | `needs_review` is appropriate because one risk is hypothesis-heavy and the prompt is internally contradictory. |
| PC-005 | `needs_review` | Story compression + no shot decomposition + weak duration/subject overload. | E-006, E-031, E-033 | keep | Good conservative behavior: split into scenes/shots before generation. |
| PC-006 | `needs_review` | Subject overload plus actions/camera; weak `too_many_subjects`. | E-006, E-031, E-033 | keep | Needs review is reasonable because weak subject-overload tag is combined with stronger action/camera risks. |
| PC-007 | `revise_first` | Low-risk contrast case with product fidelity tag only. | E-030, E-033 | maybe adjust later | Candidate for future `warn` or `generate_ok` once the rubric distinguishes prepared-keyframe cases. |
| PC-008 | `needs_review` | Model mismatch + text/logo + product fidelity + camera movement. | E-008, E-010, E-020, E-022, E-028 | keep | Conservative decision is appropriate; exact text/client package requests should be reviewed before generation. |
| PC-009 | `revise_first` | Physical-motion risk, but constrained to one action and static camera. | E-003, E-011, E-014, E-033 | maybe adjust later | Could become `warn` for constrained physical-motion prompts if validation shows acceptable output yield. |
| PC-010 | `needs_review` | Complex camera + no shot decomposition + weak duration risk. | E-029, E-031, E-032, E-033 | keep | Needs review is aligned with continuity/environment planning risk. |

## Recommendation

Keep the runtime frozen for now. The current harness behavior is conservative and schema-valid, and the generated records are useful for validation planning.

Do not change rubric/runtime immediately. The main calibration questions should be answered by adding more seed cases and later generation-trial annotations:

- Whether low-risk contrast cases like PC-007 and PC-009 should be `warn` or `generate_ok`.
- Whether missing identity references should map to `needs_review` or `revise_first`.
- Whether exact text/logo/product-package prompts should receive stronger pause behavior.
- How baseline records should be represented for fixed-budget validation.

## Commands To Re-Run

```powershell
node scripts/validate_preflight_records.mjs data/preflight_records_seed_v0.json data/preflight_record_schema_v0.json
node scripts/validate_prompt_cases.mjs data/prompt_case_seed_v0.json
node scripts/validate_preflight_rubric.mjs data/preflight_rubric_v0.json
node scripts/validate_preflight_record_schema.mjs data/preflight_record_schema_v0.json
```
