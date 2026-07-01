# Preflight MVP Contract v0

## 1. Purpose

This document defines the MVP data contract for AI video generation preflight. It describes the stable product-facing shape that a future UI or API can consume.

This is not an implementation. It does not add UI, API routes, video generation, model calls, autonomous actions, or production scoring.

## 2. Product Boundary

The MVP preflight should:

- Help users decide whether to revise before spending video-generation credits.
- Explain likely prompt risks in plain language.
- Provide actionable revision suggestions.
- Preserve weak-evidence warnings separately from stronger risk signals.
- Support audit and debug review through traceable internal fields.

The MVP preflight should not:

- Guarantee video quality.
- Call video generation APIs.
- Make autonomous generation decisions.
- Claim product usefulness is proven without generation trials and creator behavior evidence.
- Treat weak-evidence tags as validated blockers.

## 3. Input Contract

Minimal request shape:

```json
{
  "prompt_text": "Create a product launch clip for a matte black smart bottle...",
  "intended_model_or_platform": "optional string",
  "duration_seconds": 8,
  "aspect_ratio": "optional string, such as 16:9 or 9:16",
  "style_reference_notes": "optional string describing references or lack of references",
  "user_constraints": ["optional constraint strings"]
}
```

Required field:

- `prompt_text`: the prompt to inspect before generation.

Optional conservative fields:

- `intended_model_or_platform`: selected model, platform, or generation mode when known.
- `duration_seconds`: intended clip duration when known.
- `aspect_ratio`: requested format when known.
- `style_reference_notes`: reference, keyframe, style, product, or identity notes.
- `user_constraints`: hard constraints such as exact logo, identity continuity, product color, camera movement, or do-not-change requirements.

The MVP should avoid complex workflow features until the contract is accepted.

## 4. Output Contract

Stable response shape:

```json
{
  "result_id": "preflight_seed_v1-PC-003",
  "case_id": "PC-003",
  "decision": "revise_first",
  "decision_bucket": "revise_before_generation",
  "confidence": "low",
  "risk_level": "medium",
  "risk_tags": ["product_features_not_locked", "text_logo_risk", "physical_motion_risk"],
  "main_reasons": [
    "Product details are important but not fully locked.",
    "Legible logo or text fidelity is weakly evidenced.",
    "Physical motion may increase artifact risk."
  ],
  "weak_evidence_flags": ["text_logo_risk"],
  "intervention_summary": [
    "Lock product attributes.",
    "Add a reference image or keyframe.",
    "Simplify physical motion before generation."
  ],
  "suggested_revisions": [
    "Provide a product reference or keyframe.",
    "Specify which product details must remain fixed.",
    "Avoid relying on generated video for exact text/logo fidelity."
  ],
  "requires_human_review": false,
  "calibration_watchlist": true,
  "schema_limitation_notes": [
    "Text/logo risk is weakly evidenced in the current evidence base.",
    "Current records do not include observed output failures."
  ],
  "audit": {
    "source_record_id": "preflight_seed_v1-PC-003",
    "source_run_id": "preflight_seed_v1",
    "rubric_version": "preflight_rubric_v0",
    "harness_version": "preflight_harness_v0",
    "matched_rule_ids": ["product_features_not_locked", "text_logo_risk", "physical_motion_risk"],
    "evidence_level": "partially_supported",
    "hypothesis_flags": ["text_logo_risk"]
  }
}
```

Field notes:

- `decision` uses existing normalized enum values where available: `generate_ok`, `revise_first`, `needs_review`, `unknown`.
- `decision_bucket` is product-facing grouping copy. It should not replace the underlying enum.
- `risk_level` is a product-facing derived display field. Current generated records do not contain a first-class `risk_level`, so early implementations must derive it conservatively or mark it as unavailable.
- `risk_tags` should map from `detected_risk_tags`.
- `main_reasons` and `suggested_revisions` should be deterministic translations of tags/interventions, not LLM-written claims in v0.
- `weak_evidence_flags` should map from `hypothesis_flags`.
- `requires_human_review` should be true for `needs_review` and may also be true when weak-evidence flags are present.
- `calibration_watchlist` should indicate records identified by summary-layer watchlists.
- `audit` fields should remain available for reviewer/debug workflows.

## 5. User-Facing vs Internal-Only Fields

User-facing fields:

- `decision`
- `decision_bucket`
- `plain_language_summary`
- `risk_level`
- `top_reasons`
- `suggested_revisions`
- `weak_evidence_warning`
- Conservative safe-to-generate display language

Internal/audit fields:

- Raw rule ids.
- `hypothesis_flags`.
- Source record ids.
- Calibration watchlist markers.
- Schema limitation notes.
- Validation/debug metadata.
- Harness version and rubric version.
- Evidence level.

Audit fields may support expandable debug views later, but they should not be presented as product certainty.

## 6. Decision Labels

Underlying enum values should remain unchanged. UI/API copy can map them as follows:

| enum | product label | conservative UI copy |
|---|---|---|
| `generate_ok` | Ready to try | "This prompt looks constrained enough to try. Output quality is not guaranteed." |
| `revise_first` | Revise first | "Revise the prompt before spending credits. The main risks are likely avoidable." |
| `needs_review` | Review before generating | "Review this prompt carefully before generating. It may need references, shot planning, or model/tool changes." |
| `unknown` | Needs manual check | "The preflight cannot make a useful recommendation from the current data." |
| blocked, if introduced later | Do not generate yet | "Pause before generation. A required input or review step is missing." |

`blocked` is not an existing `should_generate_decision` enum in `data/preflight_record_schema_v0.json`. It is listed only as anticipated product language if a later schema adds it.

## 7. Example Payloads

### generate_ok Example

No v1 generated record currently has `decision: "generate_ok"`. This example is illustrative only and uses supported enum values.

```json
{
  "result_id": "example-generate-ok",
  "decision": "generate_ok",
  "decision_bucket": "ready_to_try",
  "confidence": "medium",
  "risk_level": "low",
  "risk_tags": ["product_features_not_locked"],
  "main_reasons": ["The prompt is narrow, uses a product reference, and avoids text or complex motion."],
  "weak_evidence_flags": [],
  "intervention_summary": ["Keep product reference attached."],
  "suggested_revisions": [],
  "requires_human_review": false,
  "calibration_watchlist": false,
  "schema_limitation_notes": ["Current v1 records over-escalate some safe-pass cases, so generate_ok needs future calibration."],
  "audit": {
    "source_record_id": "illustrative-only",
    "rubric_version": "preflight_rubric_v0",
    "matched_rule_ids": ["product_features_not_locked"],
    "evidence_level": "partially_supported",
    "hypothesis_flags": []
  }
}
```

### revise_first Example

Aligned with PC-003 in `data/preflight_records_seed_v1.json`.

```json
{
  "result_id": "preflight_seed_v1-PC-003",
  "case_id": "PC-003",
  "decision": "revise_first",
  "decision_bucket": "revise_before_generation",
  "confidence": "low",
  "risk_level": "medium",
  "risk_tags": ["product_features_not_locked", "text_logo_risk", "physical_motion_risk"],
  "main_reasons": [
    "Product details and logo/text fidelity are important.",
    "Physical motion can increase artifact risk.",
    "Text/logo risk is weakly evidenced and should stay visible."
  ],
  "weak_evidence_flags": ["text_logo_risk"],
  "intervention_summary": ["Lock product attributes.", "Add a reference image.", "Simplify motion."],
  "suggested_revisions": [
    "Attach or create a product keyframe.",
    "List the product details that must remain fixed.",
    "Avoid relying on generated video for exact readable logo text."
  ],
  "requires_human_review": false,
  "calibration_watchlist": true,
  "schema_limitation_notes": ["Current records do not include observed output failures."],
  "audit": {
    "source_record_id": "preflight_seed_v1-PC-003",
    "rubric_version": "preflight_rubric_v0",
    "matched_rule_ids": ["product_features_not_locked", "text_logo_risk", "physical_motion_risk"],
    "evidence_level": "partially_supported",
    "hypothesis_flags": ["text_logo_risk"]
  }
}
```

### needs_review Example

Aligned with PC-008 in `data/preflight_records_seed_v1.json`.

```json
{
  "result_id": "preflight_seed_v1-PC-008",
  "case_id": "PC-008",
  "decision": "needs_review",
  "decision_bucket": "review_before_generation",
  "confidence": "low",
  "risk_level": "high",
  "risk_tags": ["model_task_mismatch", "text_logo_risk", "product_features_not_locked", "complex_camera_movement"],
  "main_reasons": [
    "The task asks for exact client packaging and legible text.",
    "The prompt may not fit the selected model or mode.",
    "Fast camera/product motion increases delivery risk."
  ],
  "weak_evidence_flags": ["text_logo_risk"],
  "intervention_summary": [
    "Choose a better model or task mode.",
    "Add a reference image.",
    "Reduce camera complexity.",
    "Do not generate yet if exact packaging fidelity is mandatory."
  ],
  "suggested_revisions": [
    "Confirm whether exact text, barcode, and logo fidelity are required.",
    "Use reference assets or a tool suited to exact product/package rendering.",
    "Simplify the spin or split the shot before generation."
  ],
  "requires_human_review": true,
  "calibration_watchlist": false,
  "schema_limitation_notes": ["The current taxonomy has limited ecommerce-specific and text-fidelity evidence."],
  "audit": {
    "source_record_id": "preflight_seed_v1-PC-008",
    "rubric_version": "preflight_rubric_v0",
    "matched_rule_ids": ["model_task_mismatch", "text_logo_risk", "product_features_not_locked", "complex_camera_movement"],
    "evidence_level": "partially_supported",
    "hypothesis_flags": ["text_logo_risk"]
  }
}
```

## 8. Relationship To Current Artifacts

- `data/preflight_records_seed_v1.json`: source-level normalized preflight records. The MVP result should map from these records where possible.
- `data/preflight_summary_seed_v1.json`: aggregate report used for decision buckets, watchlists, weak-evidence counts, and schema limitation notes.
- `data/preflight_record_schema_v0.json`: current machine-checkable source record contract. The MVP contract should not imply fields that are absent unless they are explicitly derived or marked unavailable.
- `data/preflight_rubric_v0.json`: frozen rule source for risk tags, likely failures, interventions, confidence, and evidence notes.

The MVP contract is a product-facing adapter shape over these artifacts. It is not a replacement for the research records or schema.

## 9. Known Limitations

- Product usefulness is not proven yet.
- Generation trials are still needed.
- Creator behavior evidence is still needed.
- Current schema may not fully express seed/taxonomy structure.
- Current records do not include observed video output failures.
- Over-strictness may reflect missing structured fields rather than rubric failure.
- Current records do not include first-class `risk_level` or `review_pressure`.
- Some important product concerns, such as regulated claims or brand-safety review, are approximated through existing tags rather than directly represented.
- The v1 summary has no `generate_ok` records, so ready-to-try behavior needs future calibration before UI emphasis.

## 10. Phase 6 Recommendation

Phase 6 should define a deterministic preflight core adapter, not UI.

Recommended boundary:

- Input: MVP request shape plus existing record/summary artifacts where possible.
- Output: MVP result shape in this document.
- Behavior: deterministic mapping from record fields to product-facing fields.
- Audit: keep internal fields separate from user-facing fields.
- Claims: keep schema-valid and protocol-aligned separate from product-useful.

Do not build UI until this contract is reviewed and accepted.
