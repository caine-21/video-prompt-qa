# Preflight Evaluation Report

- manifest: `data\preflight_records_seed_v1.json` (36 records)
- hard pass: **True**

## Metrics

| metric | value |
|---|---|
| decision `revise_first` | 15 |
| decision `needs_review` | 21 |
| recompute matches stored | 36/36 |
| schema errors | 0 |

## Invariants
- `INV-01` record count: PASS — 36 (expected 36)
- `INV-02` schema (required fields + decision enum): PASS — 0 schema errors
- `INV-03` rubric-consistent decision recompute: PASS — 0 recompute mismatches over 36 records
- `INV-04` detected_risk_tags == matched_rule_ids: PASS — 0 identity violations
- `INV-05` no unknown rubric rule referenced: PASS — unknown tags: {}

## Known limitations
- No generate_ok decision in the 36-seed manifest — rubric is over-strict (docs/research/preflight_rubric_calibration_v1.md acknowledges this). Expected for a research seed, but it means no 'allow to generate' case is validated.

## Subject gate
- gate violated: ['F-V+', 'N-V++']  (violation rate 0.333)
- gate respected: ['F-V++']
- not triggered (control): ['S-V++']
- error records: ['N-V+', 'S-V0']
- **CASE_STUDY conflict**: Historical conflict: CASE_STUDY.md claimed G1 dropped to Overall 4.6 / Specificity 2 after the gate, but persisted tests/subject-gate-validation.json records N-V++ (=G1) Overall 6.4 / Specificity 4, verdict GATE VIOLATED. Resolved 2026-08-07 by updating CASE_STUDY.md to the persisted numbers; persisted data + this report are the single source of truth.

## Shadow revision benchmark
- status: **future** — No audited human-revised prompt samples exist in the repo. The shadow revision benchmark (original prompt -> preflight risk -> human revision -> re-preflight -> risk decrease) is listed as FUTURE, not fabricated.
