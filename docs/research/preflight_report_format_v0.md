# Preflight Report Format v0

## Purpose

The preflight report layer summarizes generated preflight records into a reviewable artifact before UI, API, or product MVP work. It turns `data/preflight_records_seed_v1.json` into `data/preflight_summary_seed_v1.json` using deterministic aggregation only.

The report is meant to help reviewers see decision pressure, weak-evidence handling, intervention patterns, and calibration watchlists without reading every normalized record manually.

## Inputs And Outputs

Default input:

- `data/preflight_records_seed_v1.json`

Default output:

- `data/preflight_summary_seed_v1.json`

Script:

- `scripts/summarize_preflight_records.mjs`

Default command:

```powershell
node scripts/summarize_preflight_records.mjs
```

Optional paths:

```powershell
node scripts/summarize_preflight_records.mjs <records_path> <summary_output_path>
```

The script does not call APIs, does not call an LLM, does not mutate source records, and fails if required record fields are missing.

## Summary JSON Structure

The summary JSON includes:

- Source metadata: source file path, source version, run id, total record count.
- Distributions: `should_generate_decision`, `confidence`, `evidence_level`, and intervention counts.
- Schema gaps: explicit notes when `risk_level`, `review_pressure`, or output failure tags are not present in the current record schema.
- Top tags: detected risk tags and hypothesis flags.
- Weak evidence: count and case-level references for records with `hypothesis_flags`.
- Records by decision: `generate_ok`, `revise_first`, `needs_review`, and `unknown` case ids.
- Review watchlists: potential over-strict and over-permissive candidates when detectable from record fields.
- Human review list: records with `needs_review` decisions or hypothesis flags.
- Actionability summary: intervention coverage and most common intervention types.
- Expressiveness notes: known limits in the current schema.

All case references are preserved by `case_id` so reviewers can trace each summary item back to a source preflight record.

## Support For Future UI/API Work

This report layer should exist before UI because it defines the reviewable data contract the UI would eventually present:

- Summary counters for dashboard or report headers.
- Decision buckets for filtering records.
- Intervention distribution for explaining what the rubric tends to recommend.
- Weak-evidence lists for audit and reviewer review.
- Calibration watchlists for detecting over-strict or over-permissive behavior.
- Schema gap notes so UI work does not imply unsupported precision.

Future API work can expose this summary directly or regenerate it from normalized preflight records. The current script is intentionally file-based and deterministic so the product-facing shape can be reviewed before building endpoints.

## What The Report Does Not Prove

The report does not prove:

- Video generation quality.
- Product usefulness.
- Creator behavior change.
- Reduced credits or retries.
- That the taxonomy is complete.
- That every intervention is correct.
- That safe-pass or review decisions are empirically calibrated.

It is deterministic evidence aggregation, not creator behavior evidence or model benchmarking.

## Schema, Protocol, And Product Usefulness

- Schema-valid: validators pass and records conform to `data/preflight_record_schema_v0.json`.
- Protocol-aligned: records are usable as validation inputs and follow the intended preflight validation protocol.
- Product-useful: not proven yet. Product usefulness still requires generation trials and creator behavior evidence.

The report can make schema-valid and protocol-aligned records easier to review. It should not be treated as product-useful proof.

## Why This Layer Comes Before UI

Building the report first reduces UI risk:

- It clarifies which fields are actually available.
- It exposes missing schema concepts before they become UI assumptions.
- It lets reviewers inspect deterministic output without product framing.
- It keeps calibration evidence separate from presentation design.
- It avoids encoding unproven claims into user-facing language.

## Known Limitations

- The current preflight record schema does not include `risk_level` or `review_pressure`.
- The report cannot fully express seed/taxonomy structure that was not included in generated records.
- Potential over-strict detection relies on deterministic reviewer-note keywords because records do not carry seed-level `should_generate` labels.
- Potential over-permissive detection is limited when no record has `generate_ok`.
- Output-side failure tags are not observed because no video-generation trials have run.
- The report does not guarantee video output quality.
- The report does not validate creator behavior, adoption, or willingness to revise prompts before generation.
