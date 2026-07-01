# Seed Case Expansion v1

## Purpose

`data/prompt_case_seed_v1.json` expands the original 10-case seed set into a broader calibration set for the preflight rubric. The goal is to expose the rubric and future harness runs to more AI video prompt failure modes before any UI, model integration, or product MVP work.

This is still a research seed, not a benchmark. It can be schema-shaped and protocol-aligned as validation input, but it does not prove product usefulness. Product usefulness still requires generation trials and creator behavior evidence.

## Case Count

Total cases: 36.

- Original v0 cases retained: 10.
- New v1 cases added: 26.
- Safe-pass or likely safe-pass cases: PC-007, PC-009, PC-012, PC-016, PC-018, PC-021, PC-023, PC-025, PC-027, PC-029, PC-032, PC-034, PC-036.
- Review or revise-before-generation cases: remaining cases.

## Coverage Table

| coverage area | representative cases | notes |
|---|---|---|
| Ambiguous subject identity | PC-002, PC-011, PC-020, PC-026, PC-035 | Uses `identity_reference_missing` and related output drift tags. |
| Unsupported or risky camera movement | PC-001, PC-010, PC-013, PC-024 | Uses `complex_camera_movement` and continuity/camera failure tags. |
| Scene continuity conflicts | PC-010, PC-013, PC-015, PC-024, PC-031 | Focuses on environment changes, no-cut requirements, and spatial continuity. |
| Physics or impossible motion | PC-001, PC-014, PC-022, PC-030, PC-035 | Covers body mechanics, transformation, and implausible physical actions. |
| Temporal inconsistency | PC-005, PC-015, PC-030, PC-031 | Uses duration/story tags because there is no separate temporal tag. |
| Style/reference ambiguity | PC-004, PC-016, PC-026 | Uses `prompt_conflict` and `identity_reference_missing`; remains hypothesis-heavy where appropriate. |
| Missing duration, framing, or shot constraints | PC-005, PC-010, PC-019, PC-030 | Expressed with `duration_too_ambitious`, `too_much_story_in_one_clip`, and `no_shot_decomposition`. |
| Unsafe, regulated, or brand-sensitive claims | PC-017, PC-028, PC-033 | Current taxonomy has no policy/legal risk tag, so these use closest available model/task, text/logo, and delivery-risk tags. |
| Overloaded simultaneous actions | PC-001, PC-006, PC-019, PC-022, PC-035 | Uses `too_many_actions`, `too_many_subjects`, and story compression tags. |
| High-risk realism claims | PC-020, PC-033, PC-035 | Focuses on identity, regulated claim, and product-delivery risk. |
| Weak-evidence / assumption-driven prompts | PC-003, PC-004, PC-005, PC-006, PC-013, PC-016, PC-024, PC-026, PC-030, PC-031, PC-033 | Includes `prompt_conflict`, `duration_too_ambitious`, `text_logo_risk`, and `too_many_subjects`. |
| Prompts that should safely pass | PC-007, PC-012, PC-018, PC-021, PC-025, PC-027, PC-029, PC-032, PC-034, PC-036 | Kept intentionally to prevent an over-strict rubric. |
| Product-useful but revise before generation | PC-003, PC-008, PC-017, PC-020, PC-022, PC-028, PC-035 | Useful ad/ecommerce concepts, but too risky to generate directly. |
| Review instead of direct generation | PC-002, PC-004, PC-008, PC-013, PC-017, PC-020, PC-026, PC-028, PC-033, PC-035 | Cases where missing references, client fidelity, policy-sensitive claims, or contradictions should trigger review pressure. |
| Intentionally debatable borderline cases | PC-009, PC-016, PC-023, PC-029, PC-032, PC-034 | These are useful for calibrating whether the rubric is too strict. |

## Safe-Pass Notes

The safe-pass cases are not risk-free. The current seed schema requires at least one prompt-side risk tag and one expected output failure tag, so safe-pass examples still carry mild tags such as `product_features_not_locked` or `physical_motion_risk`.

The intended distinction is behavioral: these prompts include enough constraints, references, narrow scope, and simple motion that generation may be reasonable without a hard pause. They should be useful for testing whether future rubric calibration over-blocks usable prompts.

## Weak-Evidence And Assumption-Driven Notes

The following tags remain conservative and should not be treated as validated blockers just because they appear more often in v1:

- `prompt_conflict`
- `duration_too_ambitious`
- `text_logo_risk`
- `too_many_subjects`

These cases are included to make assumptions visible and auditable. They should support calibration questions, not product claims.

## Schema And Validator Notes

The v1 file preserves the v0 case-object shape and existing enum values. `scripts/validate_prompt_cases.mjs` is version-aware:

- `prompt_case_seed_v0` keeps the original 8 to 12 case range.
- `prompt_case_seed_v1` accepts the expanded 30 to 50 case range.
- Both versions use the same required field and enum checks.

The schema still cannot directly express several useful distinctions:

- No explicit `expected_preflight_decision` enum beyond `should_generate` / `do_not_generate_yet`.
- No dedicated safety, legal, regulated-claim, or brand-sensitivity tag.
- No direct temporal-inconsistency prompt-side tag.
- No way to represent no-risk safe-pass prompts because at least one risk tag is required.
- No dedicated weak-evidence field; weak assumptions are expressed through existing tags and notes.

These limits are documented here rather than addressed through schema changes in Phase 2.

## Phase 3 Recommendation

Use v1 as the input for rubric calibration, not as validation proof.

Recommended Phase 3 checks:

- Decide whether low-risk product/reference cases should map to `generate_ok`, `warn`, or `revise_first`.
- Review whether `identity_reference_missing` should always trigger review or sometimes only revision.
- Keep weak-evidence tags separate in future generated records.
- Use the v1-aware prompt-case validator before regenerating harness outputs from this expanded seed.
- Avoid treating brand-sensitive or regulated-claim examples as handled by the current taxonomy; they currently expose a taxonomy gap.
