# Prompt Case Dataset v0

## Purpose

`data/prompt_case_seed_v0.json` is a seed dataset for turning the failure taxonomy into a reviewable preflight rubric and validation protocol. It is not a final model benchmark, not a product claim, and not proof that preflight reduces wasted generations.

The dataset is meant to make prompt-side risk tags concrete enough for reviewer discussion before any product logic or LLM judging is implemented.

## Schema

Each case includes:

- `id`: stable case ID.
- `prompt`: input prompt to inspect before generation.
- `prompt_side_risk_tags`: risk tags from `docs/research/failure_taxonomy_v0.md`.
- `expected_output_failure_tags`: likely failure tags from the taxonomy.
- `evidence_ids`: evidence rows from `docs/research/pain_evidence_log.md`; empty when the case is hypothesis-only.
- `evidence_links`: local references for reviewer lookup.
- `confidence`: `low`, `medium`, or `high`.
- `should_generate`: whether the seed rubric would allow generation after preflight.
- `do_not_generate_yet`: whether the case should pause before spending credits.
- `notes`: short rationale and caveats.

## Supported vs Hypothesis-Heavy Tags

Better-supported tags in the seed:

- `identity_reference_missing`
- `no_shot_decomposition`
- `physical_motion_risk`
- `camera_not_following_prompt`
- `face_character_drift`
- `high_retry_cost`

Still hypothesis-heavy or weakly evidenced:

- `prompt_conflict`
- `duration_too_ambitious`
- `text_logo_risk`
- `too_many_subjects`
- `do_not_generate_yet`
- Negative/avoid-list behavior

These tags should not be treated as validated until more direct creator/community evidence or prompt cases are collected.

## Current Coverage

The seed contains 10 cases and covers at least:

- `prompt_conflict`
- `too_many_subjects`
- `duration_too_ambitious`
- `text_logo_risk`
- `camera_not_following_prompt`
- `face_character_drift`
- `high_retry_cost`
- `do_not_generate_yet`

## How To Extend

Add new cases only when they clarify one of these needs:

- A direct creator/community example maps to a prompt-side risk.
- A weak tag gets a concrete prompt case for reviewer debate.
- A supported tag needs a low-risk contrast case where generation should proceed.
- A case tests whether preflight changes behavior before clicking generate.

Do not add LLM scoring, model benchmarking, API calls, or product workflow assumptions to this dataset. Keep it as research input until a validation protocol is defined and run.

## Schema Check

Run:

```powershell
node scripts/validate_prompt_cases.mjs data/prompt_case_seed_v0.json
```

The script only checks structure and tag consistency. It does not judge prompt quality.
