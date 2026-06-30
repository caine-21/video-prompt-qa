# Validation Protocol v0

## Purpose

This protocol defines how to validate future preflight rubric or MVP logic before implementation. It uses `data/prompt_case_seed_v0.json` as the initial case source, but the seed dataset is for protocol design only. It is not a statistical sample and does not support broad product claims.

The protocol asks whether preflight changes creator behavior before generation and whether that change reduces avoidable retries on concrete cases.

## 1. Fixed-Budget Experiment

### Purpose

Evaluate whether the preflight rubric improves prompt quality and usable output yield under a fixed generation budget.

### Setup

- Input: one prompt case from `data/prompt_case_seed_v0.json`.
- Baseline: original prompt without preflight intervention.
- Treatment: prompt after preflight rubric suggestion, rewrite, or warning.
- Budget: fixed number of generations per case, such as 1 or 2 generations for baseline and 1 or 2 generations for treatment.

### Expected Observations

The fixed-budget experiment should compare usable output yield under the same budget, not just cleaner prompts or lower retry likelihood.

Core metrics:

- `usable_clips_per_100_credits`
- `usable_clip_count`
- `credits_spent`
- `prompt_adherence_notes`

Record whether treatment shows:

- Fewer obvious prompt-side risks.
- Fewer expected failure tags triggered.
- Clearer `should_generate` / `do_not_generate_yet` decision.
- Lower retry likelihood.

### What This Can Support

- Whether the rubric can identify and reduce visible prompt-side risk on specific seed cases.
- Whether reviewers can apply the rubric consistently enough to produce a clearer generation decision.
- Whether treatment prompts appear better constrained before spending generation budget.
- Whether treatment yields more usable outputs under the same credit budget.

### What This Cannot Prove

- That the product is validated.
- That video output quality improves across models or creator segments.
- That all taxonomy tags are correct.
- That preflight reduces total cost in real creator workflows.

## 2. Stop-When-Usable Experiment

### Purpose

Measure whether preflight reduces the number of attempts needed to reach a usable output.

### Setup

- Input: one prompt case from `data/prompt_case_seed_v0.json`.
- Baseline loop: generate -> inspect -> revise manually until usable or max attempts.
- Treatment loop: preflight first -> generate -> inspect -> revise until usable or max attempts.
- Max attempts: define before the run, such as 3 to 5 attempts per case per condition.

### Stopping Criteria

Stop when the output is:

- Usable enough for the intended ecommerce, ad, or social video use.
- Free of critical failure tags.
- Acceptably adherent to key prompt constraints.

### Measured Outcomes

Record:

- Attempts-to-usable.
- `regeneration_count`
- `credits_per_usable_clip`
- `stopped_reason`
- Critical failure count.
- Retry cost.
- Human revision burden.

### What This Can Support

- Whether preflight reduces attempts-to-usable on specific cases.
- Whether preflight reduces critical failure count or revision burden under the tested conditions.
- Whether `do_not_generate_yet` decisions prevent obviously wasteful attempts on high-risk cases.

### What This Cannot Prove

- That preflight works for every model, prompt type, or creator segment.
- That the taxonomy is complete.
- That the treatment effect will hold without controlled follow-up runs.
- That the MVP should be built without additional user evidence.

## Protocol Boundaries

- This is not model benchmarking.
- This is not proof of video generation quality.
- This does not validate all taxonomy tags.
- Hypothesis-heavy tags remain hypothesis-heavy until direct creator evidence or generation trials exist.
- The current seed dataset is for protocol design, not statistical claims.

## Annotation Fields

Future validation runs should record at least:

- `case_id`
- `condition`: baseline / treatment
- `model_tool_used`
- `prompt_version`
- `preflight_tags`
- `intervention_applied`
- `should_generate_decision`
- `generated_output_notes`
- `observed_failure_tags`
- `usable`
- `attempts_count`
- `reviewer_notes`
- `evidence_confidence_notes`

## Success Criteria v0

Conservative success signals:

- The rubric catches high-risk prompts before generation.
- The rubric does not over-block obviously usable prompts.
- Treatment reduces attempts-to-usable on at least some high-risk seed cases.
- Any improvement claim is tied to recorded cases, not general product claims.

## Non-Goals

This protocol does not define:

- UI implementation.
- Scoring algorithm.
- LLM judge behavior.
- Production roadmap.
- Pricing / ROI model.
