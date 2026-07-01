# Preflight Harness Seed Audit v0

## Purpose

This is a reviewer-facing audit note for the offline preflight harness seed run. It summarizes generated records for inspection. It is not a design doc, empirical validation, model benchmark, or product claim.

## Run Inputs

- Prompt cases: `data/prompt_case_seed_v0.json`
- Rubric: `data/preflight_rubric_v0.json`
- Record schema: `data/preflight_record_schema_v0.json`
- Harness runner: `scripts/run_preflight_harness.mjs`

## Output

- Generated records: `data/preflight_records_seed_v0.json`

## Summary

- Total record count: 10
- `should_generate_decision` distribution:
  - `revise_first`: 4
  - `needs_review`: 6
- `evidence_level` distribution:
  - `workflow_supported`: 1
  - `partially_supported`: 9
- Records with `hypothesis_flags`: 6
- Weak-evidence tags observed:
  - `prompt_conflict`
  - `duration_too_ambitious`
  - `text_logo_risk`
  - `too_many_subjects`

## Conservative Limitations

- The harness uses seed case annotations and rubric mapping only.
- The harness does not perform NLP, semantic inference, LLM judging, API calls, video generation, or autonomous agent behavior.
- Weak-evidence tags are preserved in `hypothesis_flags` and are not treated as empirically validated blockers.
- The generated records are validation inputs, not validation results.
- This run does not prove the rubric improves output quality, reduces credits, or generalizes beyond the seed cases.

## Commands Run

```powershell
node scripts/run_preflight_harness.mjs
node scripts/validate_preflight_records.mjs data/preflight_records_seed_v0.json data/preflight_record_schema_v0.json
node scripts/validate_prompt_cases.mjs data/prompt_case_seed_v0.json
node scripts/validate_preflight_rubric.mjs data/preflight_rubric_v0.json
node scripts/validate_preflight_record_schema.mjs data/preflight_record_schema_v0.json
```
