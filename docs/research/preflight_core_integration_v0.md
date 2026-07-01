# Preflight Core Integration v0

## Purpose

This note documents the first core preflight adapter boundary in `lib/preflight`.

The adapter maps one normalized preflight record into the MVP contract shape described in `docs/product/preflight_mvp_contract_v0.md`. It is deterministic and side-effect free.

## What It Does

- Accepts one existing preflight record-like object.
- Requires only `record_id`, `case_id`, and `should_generate_decision`.
- Maps raw decision enums to conservative product labels.
- Derives a display risk level from the normalized decision.
- Converts risk tags and interventions into deterministic user-facing copy.
- Preserves audit fields such as source ids, raw decision, matched rules, hypothesis flags, evidence level, harness version, and rubric version.
- Keeps weak-evidence warnings visible.

## What It Does Not Do

- It does not run the rubric.
- It does not run the harness.
- It does not call APIs or LLMs.
- It does not generate video.
- It does not mutate seed cases, records, summaries, schemas, or rubric JSON.
- It does not make autonomous generation decisions.
- It does not claim product usefulness or output quality.

## Mapping Boundary

Raw records provide:

- `should_generate_decision`
- `detected_risk_tags`
- `hypothesis_flags`
- `recommended_interventions`
- `matched_rule_ids`
- `confidence`
- `evidence_level`
- source ids and version metadata

The adapter returns:

- `user_facing`: decision, display label, plain-language summary, risk level, reasons, suggested revisions, weak-evidence warning, and human-review indicator.
- `audit`: source ids, raw decision fields, matched rules, hypothesis flags, rationale, reviewer notes, schema limitation notes, and version metadata.

## Schema, Protocol, And Product Usefulness

- Schema-valid: validators pass and records conform to the schema.
- Protocol-aligned: records and adapter outputs are usable as validation or integration inputs and follow the intended preflight validation protocol.
- Product-useful: not proven yet. Product usefulness still requires generation trials and creator behavior evidence.

The current adapter can preserve schema-valid and protocol-aligned data, but it does not prove product usefulness. It is only a deterministic mapping boundary for future UI/API work. UI/API implementation and real creator behavior evidence remain deferred.

## Deferred UI/API Work

UI and API work are intentionally deferred until this boundary is reviewed. The next phase can consume the adapter without re-deciding rubric behavior or mixing audit fields into user-facing copy.

## Known Limitations

- Current records do not include first-class `risk_level` or `review_pressure`.
- The adapter derives display risk level from normalized decision, so it is conservative and coarse.
- Calibration watchlist markers are preserved only if supplied on the input record.
- The adapter cannot identify safe-pass over-strictness by itself because source records do not include seed-level `should_generate`.
- Product usefulness still requires generation trials and creator behavior evidence.
