# Preflight Rubric v0

## Purpose

This rubric maps prompt-side risk tags to conservative preflight interventions before any UI, app logic, LLM judge, or API integration exists.

It is derived from:

- `docs/research/failure_taxonomy_v0.md`
- `data/prompt_case_seed_v0.json`
- `docs/research/validation_protocol_v0.md`

This is not validated product logic. It is a research spec for reviewer discussion and future validation runs.

## Decision Levels

| should_generate_impact | Meaning |
|---|---|
| allow | Prompt appears constrained enough to generate, while still recording known risk. |
| warn | Prompt can proceed, but reviewer should call out a specific risk. |
| revise_first | Prompt should be revised before generation because expected failure risk is material. |
| do_not_generate_yet | Prompt is likely wasteful under current evidence or lacks required setup. Pause and revise before spending credits. |

Use the least severe decision that protects the generation budget. Hypothesis-heavy tags should not automatically block generation unless combined with stronger supported risks.

## Rubric Table

| risk_tag | detection_hint | confidence | likely_failure_tags | suggested_intervention | should_generate_impact | evidence_ids | notes / caveats |
|---|---|---|---|---|---|---|---|
| too_many_subjects | Prompt asks the model to coordinate many people, products, props, or background entities in one clip. | low | prompt_ignored; face_character_drift; scene_environment_inconsistency | simplify_prompt; reduce_simultaneous_constraints; split_into_shots | warn | E-006; E-031; E-033 | Hypothesis-heavy. Do not block on this tag alone; ask reviewer to identify the primary subject and remove nonessential entities. |
| too_many_actions | Prompt chains several simultaneous or sequential actions into one generation. | medium | hand_body_action_artifacts; prompt_ignored; camera_not_following_prompt | simplify_prompt; split_into_shots; reduce_simultaneous_constraints | revise_first | E-001; E-003; E-011; E-014 | Stronger when actions include body mechanics, transformations, or physics. |
| complex_camera_movement | Prompt depends on orbit, pan, tracking, dolly, zoom, handheld, or 360-degree movement. | medium | camera_not_following_prompt; scene_environment_inconsistency; continuity_break | reduce_camera_complexity; create_storyboard_first; generate_image_keyframe_first | revise_first | E-029; E-031; E-032; E-033 | Workflow-supported, not a broad model benchmark. Prefer simpler camera path or shot plan. |
| identity_reference_missing | Prompt requires stable character, face, costume, or identity without reference assets. | medium | face_character_drift; identity_style_drift; continuity_break | add_reference_image; generate_image_keyframe_first; create_storyboard_first | do_not_generate_yet | E-004; E-027; E-030 | Supported by workflow evidence. Pause when identity continuity is central and no reference exists. |
| product_features_not_locked | Prompt requires stable product shape, material, color, logo placement, or package details without locked attributes. | medium | product_deformation; unusable_for_client_delivery; prompt_ignored | lock_product_attributes; add_reference_image; generate_image_keyframe_first | revise_first | E-013; E-022; E-030 | Needs more ecommerce-specific cases. Escalate to do_not_generate_yet when exact client asset fidelity is required. |
| prompt_conflict | Prompt contains incompatible style, camera, subject, lighting, motion, or realism requirements. | low | prompt_ignored; identity_style_drift; camera_not_following_prompt | simplify_prompt; reduce_simultaneous_constraints | warn |  | Hypothesis-heavy and not directly evidenced in the current evidence log. Use as a reviewer question, not a validated blocker. |
| too_much_story_in_one_clip | Prompt compresses a multi-beat story, multiple scene changes, or a long temporal arc into one clip. | medium | prompt_ignored; continuity_break; high_retry_cost | split_into_shots; create_storyboard_first; simplify_prompt | revise_first | E-001; E-006; E-031; E-033 | Use when the prompt reads like a sequence rather than a single shot. |
| no_shot_decomposition | Prompt lacks a single-shot boundary when it describes a sequence, multiple locations, or multiple camera setups. | medium | continuity_break; camera_not_following_prompt; prompt_ignored | split_into_shots; create_storyboard_first | revise_first | E-006; E-031; E-033 | Supported by workflow evidence. Treatment should produce shot-level prompts before generation. |
| model_task_mismatch | Requested task appears poorly matched to selected model or mode. | low | prompt_ignored; unusable_for_client_delivery; high_retry_cost | choose_better_model_task_mode; do_not_generate_yet | warn | E-008; E-028 | Weak direct evidence. Use as a routing/checklist prompt until generation trials exist. |
| duration_too_ambitious | Prompt expects more action, continuity, or story than the requested duration can likely support. | low | prompt_ignored; continuity_break; high_retry_cost | simplify_prompt; split_into_shots | warn |  | Hypothesis-heavy and not directly evidenced. Do not block unless paired with multi-action or no-shot-decomposition risk. |
| physical_motion_risk | Prompt depends on complex body mechanics, physics, fluid motion, splashes, machinery, or precise action accuracy. | medium | hand_body_action_artifacts; prompt_ignored; unusable_for_client_delivery | simplify_prompt; split_into_shots; reduce_simultaneous_constraints | revise_first | E-003; E-011; E-014 | Partially supported. Keep action simple or isolate it in one constrained shot. |
| text_logo_risk | Prompt requires legible text, exact typography, logos, barcodes, signage, or brand marks inside generated video. | low | product_deformation; prompt_ignored; unusable_for_client_delivery | lock_product_attributes; add_reference_image; do_not_generate_yet | revise_first | E-010 | Weak evidence. Escalate for unpublished brand/client material only when permission and references are available. |

## Combination Rules

- If a prompt has only low-confidence hypothesis tags, default to `warn` unless the prompt would spend meaningful credits on an obviously under-specified request.
- If a prompt combines `identity_reference_missing` with continuity requirements, use `do_not_generate_yet`.
- If a prompt combines `product_features_not_locked` with client delivery or exact packaging/logo requirements, use at least `revise_first`.
- If a prompt combines `too_many_actions`, `complex_camera_movement`, and `physical_motion_risk`, use `revise_first` and recommend shot splitting.
- If a prompt combines `model_task_mismatch` with `text_logo_risk` or exact product fidelity, consider `do_not_generate_yet` until model/tool choice is reviewed.

## Boundary Notes

- This rubric does not claim validation.
- This rubric does not implement product logic.
- This rubric does not use an LLM judge.
- This rubric does not call APIs.
- This rubric should be tested through `docs/research/validation_protocol_v0.md` before being used for MVP behavior.
- Improvement claims must be tied to recorded validation cases, not general product claims.

## Next Validation Use

Use this rubric to annotate baseline and treatment prompts in future validation records:

- Identify prompt-side risk tags.
- Apply the conservative intervention.
- Record `should_generate` impact.
- Compare fixed-budget usable output yield and stop-when-usable attempts using the validation protocol.
