# Failure Taxonomy v0

## 1. Purpose

This taxonomy defines early research categories for:

- Prompt-side risks detectable before generation.
- Output-side failures visible after generation.
- Preflight interventions that might change creator behavior before clicking generate.

This is a research artifact, not implemented product logic. It is not validated, complete, or a product roadmap.

## 2. North Star

Can a 30-second preflight identify likely failure modes early enough to change creator behavior before clicking generate?

## 3. Evidence Base

This taxonomy is grounded in `docs/research/pain_evidence_log.md`.

Evidence classes:

- Direct pain/cost evidence: E-016 to E-025.
- Workflow/preflight behavior evidence: E-027 to E-033.
- Context / taxonomy / technical premise: E-001 to E-015, especially E-013.

This evidence supports a working taxonomy for research and evaluation design. It does not validate the product direction or prove that creators will use a 30-second preflight.

## 4. Prompt-Side Risk Tags

| risk_tag | definition | detectable_before_generation | common prompt signals | likely output failures | preflight intervention | supporting evidence | status |
|---|---|---|---|---|---|---|---|
| too_many_subjects | Prompt asks the model to preserve or coordinate too many subjects in one clip. | yes | Multiple people, products, props, or background entities all described as important. | prompt_ignored; face_character_drift; scene_environment_inconsistency | simplify_prompt; reduce_simultaneous_constraints; split_into_shots | E-006, E-031, E-033 indirectly | assumption needing prompt cases |
| too_many_actions | Prompt asks for several simultaneous or sequential actions in one generation. | yes | Multiple verbs, chained actions, physical transformations, or multi-step events. | hand_body_action_artifacts; prompt_ignored; camera_not_following_prompt | simplify_prompt; split_into_shots; reduce_simultaneous_constraints | E-001, E-003, E-011, E-014 | partially supported |
| complex_camera_movement | Prompt depends on camera motion that changes framing, perspective, or environment continuity. | yes | Orbit, pan, dolly, tracking shot, zoom, handheld, 360-degree movement. | camera_not_following_prompt; scene_environment_inconsistency; continuity_break | reduce_camera_complexity; create_storyboard_first; generate_image_keyframe_first | E-029, E-031, E-032, E-033 | partially supported / workflow-supported |
| identity_reference_missing | Prompt depends on stable character or face identity without enough reference material. | yes | Same person across shots, named character, face close-up, costume continuity. | face_character_drift; identity_style_drift; continuity_break | add_reference_image; create_storyboard_first; split_into_shots | E-004, E-027, E-030 | supported by workflow evidence |
| product_features_not_locked | Prompt requires stable product shape, material, logo placement, or visual details without locking attributes. | yes | Ecommerce product, packaging, garment, device, prop, brand asset, product demo. | product_deformation; unusable_for_client_delivery; prompt_ignored | lock_product_attributes; add_reference_image; generate_image_keyframe_first | E-022, E-030, E-013 | partially supported; needs more product-specific cases |
| prompt_conflict | Prompt contains incompatible instructions or competing constraints. | yes | Contradictory style, camera, subject, lighting, motion, or realism requirements. | prompt_ignored; identity_style_drift; camera_not_following_prompt | simplify_prompt; reduce_simultaneous_constraints; do_not_generate_yet | Not strongly present in current evidence | assumption |
| too_much_story_in_one_clip | Prompt tries to compress a multi-beat story into a single short video. | yes | Beginning/middle/end, multiple scene changes, many narrative beats, long temporal arc. | prompt_ignored; continuity_break; high_retry_cost | split_into_shots; create_storyboard_first; simplify_prompt | E-001, E-006, E-031, E-033 | partially supported |
| no_shot_decomposition | Prompt lacks a one-shot boundary when the intended output needs shot planning. | yes | Scene sequence, storyboard-like request, multiple locations, multiple camera setups. | continuity_break; camera_not_following_prompt; prompt_ignored | split_into_shots; create_storyboard_first | E-006, E-031, E-033 | supported by workflow evidence |
| model_task_mismatch | Chosen model or mode does not fit the requested task. | yes | Character consistency, product fidelity, live-action realism, text/logo, complex motion, or audio expectations assigned to a weak mode. | prompt_ignored; unusable_for_client_delivery; high_retry_cost | choose_better_model_task_mode; do_not_generate_yet | E-008, E-028 | partially supported, weak direct evidence |
| duration_too_ambitious | Prompt expects more action, continuity, or story than the clip duration can reliably support. | yes | Long-duration request, many events in a short clip, or broad scene evolution. | prompt_ignored; continuity_break; high_retry_cost | simplify_prompt; split_into_shots; do_not_generate_yet | Not directly evidenced | assumption |
| physical_motion_risk | Prompt depends on complex body mechanics, physics, liquid motion, or action accuracy. | yes | Gymnastics, flips, running, fighting, dancing, fluid dynamics, splashes, machinery. | hand_body_action_artifacts; prompt_ignored; unusable_for_client_delivery | simplify_prompt; reduce_simultaneous_constraints; split_into_shots | E-003, E-011, E-014 | partially supported |
| text_logo_risk | Prompt requires legible text, logo fidelity, or exact typography inside generated video. | yes | Text overlay, signage, package text, logo placement, brand marks. | product_deformation; prompt_ignored; unusable_for_client_delivery | lock_product_attributes; add_reference_image; do_not_generate_yet | E-010 partial | weak / needs better evidence |

## 5. Output-Side Failure Tags

| failure_tag | definition | visible_after_generation | likely prompt-side causes | review question | supporting evidence | status |
|---|---|---|---|---|---|---|
| face_character_drift | Character face, body, costume, or identity changes unintentionally. | yes | identity_reference_missing; too_many_subjects; no_shot_decomposition | Did the same character remain recognizable and consistent? | E-004, E-027, E-030 | supported |
| product_deformation | Product, prop, or object shape/material/details change or become unusable. | yes | product_features_not_locked; text_logo_risk; physical_motion_risk | Did the product remain accurate enough for review or delivery? | E-013, E-020, E-022, E-030 | supported |
| hand_body_action_artifacts | Hands, bodies, joints, or physical actions become distorted or implausible. | yes | physical_motion_risk; too_many_actions; too_much_story_in_one_clip | Did the body/action look physically plausible? | E-003, E-011, E-013, E-014 | supported |
| camera_not_following_prompt | Camera path, framing, angle, or movement does not follow the prompt. | yes | complex_camera_movement; prompt_conflict; no_shot_decomposition | Did the camera do what the creator asked? | E-016, E-019, E-029, E-032, E-033 | partially supported |
| scene_environment_inconsistency | Environment shifts, breaks spatial continuity, or changes unexpectedly. | yes | complex_camera_movement; no_shot_decomposition; too_many_subjects | Did the environment stay coherent across the clip? | E-032, E-033, indirect E-013 | partially supported / workflow-supported |
| prompt_ignored | Output misses important prompt instructions. | yes | too_many_actions; prompt_conflict; model_task_mismatch; duration_too_ambitious | Which required prompt constraints were ignored? | E-016, E-018, E-019, E-021, E-024 | supported |
| identity_style_drift | Style, representation, or identity constraints drift away from the intended direction. | yes | identity_reference_missing; prompt_conflict; model_task_mismatch | Did the output preserve intended identity, style, and representation constraints? | E-004, E-012, E-027, E-030 | supported |
| unusable_for_client_delivery | Output is too distorted, off-brief, or unreliable for delivery. | yes | product_features_not_locked; prompt_ignored; physical_motion_risk; text_logo_risk | Could this output be delivered to a client or used in a campaign? | E-020, E-022, E-025 | supported |
| high_retry_cost | The failure pattern forces repeated paid generations or excessive time. | yes | too_much_story_in_one_clip; model_task_mismatch; duration_too_ambitious; prompt_ignored | How many credits, retries, or hours did this failure create? | E-017, E-020, E-021, E-023, E-024, E-026 | supported |
| continuity_break | Shot-to-shot, object, character, or environment continuity fails. | yes | no_shot_decomposition; complex_camera_movement; identity_reference_missing | What changed unexpectedly across the intended sequence? | E-031, E-032, E-033 | partially supported / workflow-supported |

Note: `high_retry_cost` is an operational/cost failure tag, not a visual output artifact.

## 6. Preflight Intervention Library

| intervention | when_to_recommend | example_trigger | expected_behavior_change | supporting_evidence | status |
|---|---|---|---|---|---|
| simplify_prompt | Prompt has too many constraints, actions, or important entities. | Multiple actions and style constraints in one short clip. | User removes lower-priority constraints before generation. | E-001, E-006, E-019, E-021 | partially supported |
| split_into_shots | Prompt describes multiple beats, camera setups, or scene changes. | One prompt asks for setup, action, reveal, and reaction. | User creates separate shot prompts instead of one overloaded prompt. | E-006, E-031, E-033 | supported by workflow evidence |
| add_reference_image | Identity, costume, product, prop, or environment continuity matters. | Same character or product must stay stable across clips. | User adds or prepares reference images before generation. | E-027, E-030, E-033 | supported by workflow evidence |
| lock_product_attributes | Product accuracy is central to usability or client delivery. | Prompt includes product shape, material, color, package, or logo constraints. | User writes explicit product constraints or uses references before generation. | E-022, E-030 | partially supported; needs more ecommerce evidence |
| choose_better_model_task_mode | Requested task may not match the selected tool or mode. | Character consistency, live-action realism, text/logo fidelity, or complex motion. | User changes model/mode or postpones generation. | E-008, E-028 | weak to moderate |
| reduce_camera_complexity | Camera motion creates continuity or framing risk. | Orbit, tracking shot, 360-degree environment, or fast camera move. | User uses simpler camera movement or plans environment continuity first. | E-029, E-032, E-033 | workflow-supported |
| reduce_simultaneous_constraints | Prompt contains many constraints that compete for model attention. | Multiple subjects, actions, camera moves, style rules, and product details. | User prioritizes the most important constraint before generation. | E-001, E-006, E-031 | partially supported |
| create_storyboard_first | Prompt is narrative, multi-shot, or continuity-heavy. | User wants a short film, ad sequence, or multi-beat scene. | User sketches or writes shot-level intent before generating. | E-031, E-033 | supported by workflow evidence |
| generate_image_keyframe_first | Visual consistency or composition needs to be anchored before video. | Character, product, or environment must match a specific look. | User creates still keyframes before generating video clips. | E-030, E-033 | supported by workflow evidence |
| prepare_negative_avoid_list | Prompt needs to avoid unwanted objects, artifacts, or style drift. | User has known unwanted elements from prior generations. | User writes avoid/negative constraints before generation. | E-007 | assumption / needs more evidence |
| do_not_generate_yet | Risk is high and the prompt lacks enough structure or references. | High credit cost, missing references, model mismatch, or overly broad task. | User pauses before spending credits and revises the prompt/setup. | Implied by E-017, E-020, E-023, E-024 | assumption; needs behavior validation |

## 7. Risk-To-Failure Mapping

| prompt_side_risk | likely_output_failures | recommended_preflight_interventions | evidence | confidence |
|---|---|---|---|---|
| too_many_subjects | prompt_ignored; face_character_drift; scene_environment_inconsistency | simplify_prompt; reduce_simultaneous_constraints; split_into_shots | E-006, E-031, E-033 indirectly | low |
| too_many_actions | hand_body_action_artifacts; prompt_ignored | simplify_prompt; split_into_shots; reduce_simultaneous_constraints | E-001, E-003, E-011, E-014 | medium |
| complex_camera_movement | camera_not_following_prompt; scene_environment_inconsistency; continuity_break | reduce_camera_complexity; create_storyboard_first | E-029, E-031, E-032, E-033 | medium |
| identity_reference_missing | face_character_drift; identity_style_drift; continuity_break | add_reference_image; generate_image_keyframe_first | E-004, E-027, E-030 | medium |
| product_features_not_locked | product_deformation; unusable_for_client_delivery | lock_product_attributes; add_reference_image | E-022, E-030, E-013 | medium |
| prompt_conflict | prompt_ignored; identity_style_drift; camera_not_following_prompt | simplify_prompt; reduce_simultaneous_constraints | Not strongly present | low |
| too_much_story_in_one_clip | prompt_ignored; continuity_break; high_retry_cost | split_into_shots; create_storyboard_first | E-001, E-006, E-031, E-033 | medium |
| no_shot_decomposition | continuity_break; camera_not_following_prompt | split_into_shots; create_storyboard_first | E-006, E-031, E-033 | medium |
| model_task_mismatch | prompt_ignored; unusable_for_client_delivery; high_retry_cost | choose_better_model_task_mode; do_not_generate_yet | E-008, E-028 | low |
| duration_too_ambitious | prompt_ignored; continuity_break; high_retry_cost | simplify_prompt; split_into_shots | Not directly evidenced | low |
| physical_motion_risk | hand_body_action_artifacts; prompt_ignored | simplify_prompt; reduce_simultaneous_constraints | E-003, E-011, E-014 | medium |
| text_logo_risk | product_deformation; prompt_ignored; unusable_for_client_delivery | lock_product_attributes; add_reference_image; do_not_generate_yet | E-010 partial | low |

`prompt_conflict` remains hypothesized and is not directly evidenced in the current evidence log; keep its confidence low until direct prompt cases support it.

## 8. Assumptions / Needs More Evidence

These categories should not be treated as validated until supported by more direct creator/community evidence or prompt cases:

- `prompt_conflict`.
- `duration_too_ambitious`.
- `text_logo_risk`.
- `too_many_subjects`.
- Negative/avoid list as creator behavior.
- `do_not_generate_yet` recommendation.
- Failed attempts not captured as reusable knowledge.
- Client revision loop as a distinct failure category.

## 9. Non-Goals For v0

- No automated video analysis.
- No model benchmarking claims.
- No claim that taxonomy is complete.
- No claim that preflight reduces waste until validation protocol is run.
- No implementation logic.
- No MVP roadmap.
