# Product Discovery v0

## 0. Working Hypothesis

AI video creators do not mainly need another prompt beautifier.

They need a way to reduce generation lottery: fewer wasted credits, fewer blind retries, and more reusable knowledge about why a video generation failed.

This document frames one narrow product direction for validation before changing UI, adding model integrations, or building new features.

## 1. Target Users

Initial validation users:

- Solo creators or small teams producing ecommerce or advertising assets at least weekly.
- Users who already pay for AI video credits, or who regularly hit free-tier limits.
- Teams or individuals who regularly use Kling, Runway, Pika, Jimeng, Sora, or similar AI video tools.
- Common output types: product demos, character-driven selling clips, brand short films, social media assets, ad variants, and short-form campaign materials.

The current assumption is that these users care less about abstract prompt quality and more about whether a prompt can produce a usable clip within a reasonable number of generations.

## 2. Current Workflow

Typical workflow:

```text
Idea / script
  -> write prompt
  -> choose model
  -> generate 4-10 times
  -> pick the least-broken result
  -> manually edit prompt
  -> generate again
  -> useful lessons scatter across chat history, spreadsheets, and memory
  -> next task starts from guessing again
```

The key waste is not only credits. The user also spends time judging failed outputs, rewriting prompts without a clear failure model, and rediscovering the same model limitations.

## 3. High-Frequency Failures

For v0, do not generalize beyond these observed or assumed failure categories:

- Character or face inconsistency.
- Broken hands, bodies, or physical actions.
- Product shape deformation.
- Camera movement not following the prompt.
- Complex prompts trying to do too much in one generation.
- No shot decomposition, forcing the model to handle character, product, camera, action, and style simultaneously.
- No post-failure review, so the next rewrite still relies on intuition.

These categories should be treated as hypotheses until validated against real prompts and creator feedback.

## 4. Why Current Alternatives Are Weak

ChatGPT prompt rewriting:

- Too generic.
- Usually optimizes for richer wording, not lower generation risk.
- Does not know the specific failure patterns of the target video model.

Bilibili / Xiaohongshu tutorials:

- High learning cost.
- Useful for general education, but not for instant risk judgment on the current prompt.
- Hard to turn into team-level reusable rules.

Manual spreadsheet tracking:

- High review cost.
- Usually happens after failure, not before generation.
- Does not give real-time warnings while the user is writing the next prompt.

Platform-native prompt enhancement:

- Usually behaves like a prompt polish feature.
- Tends to add detail rather than reduce model burden.
- Does not act as a failure-risk checker.

## 5. First Product Cut

This is not an AI video prompt optimizer.

The first cut is:

```text
30-second preflight before generation:
judge whether this prompt is likely to trigger generation lottery,
explain why it may fail,
decide whether it should be split into shots,
and produce a safer first version.
```

The product promise is not "make the prompt prettier."

The product promise is:

```text
Reduce wasted generations before the user spends credits.
```

## 6. MVP Input And Output

User input:

- Original prompt.
- Target platform or model.
- Video type: product demo, human action, ad shot, short-drama storyboard, or other.
- Whether character reference images are available.
- Whether product reference images are available.
- Expected duration.
- Hard client requirements, if any.

Tool output:

- Risk level: low, medium, or high.
- Main failure risks: character, camera, action, product, duration, too many subjects, or too many simultaneous constraints.
- Whether shot decomposition is recommended.
- Rewritten anti-lottery prompt.
- Negative prompt or avoid list.
- Post-generation review fields:
  - What failed this time?
  - Which risk tag did it match?
  - What rule should be changed next time?

## 7. Validation Experiment

This is the most important part of the direction.

Collect 30 high-risk prompts from real creator workflows whenever possible. If synthetic prompts are used to fill gaps, mark them separately and do not mix them into evidence claims without that label.

- 10 product / ecommerce shots.
- 10 human action / talking-head / selling clips.
- 10 complex camera / multi-subject / multi-action prompts.

For each prompt, create two versions:

- A: original prompt.
- B: anti-lottery version after preflight.

Run two validation modes.

Fixed-budget test:

- Same video model.
- Same settings.
- Same number of generations.
- Same review process.
- Compare usable clips per 100 credits.

Stop-when-usable test:

- Simulate the real workflow.
- Keep regenerating until a usable clip appears or a predefined cap is reached.
- Compare regeneration count and credits consumed per usable clip.

Blind review each result on:

- Whether the clip is usable.
- Whether it follows the prompt.
- Whether character or product identity remains stable.
- Whether the camera follows the intended movement.
- Whether another regeneration is required.
- How many credits were consumed per usable clip.

Core metrics:

- Usable clips per 100 credits.
- First-pass usable rate.
- Average regeneration count.
- Prompt edit count.
- Whether the failure reason can be reviewed and turned into a reusable rule.

Behavioral validation:

- Did the preflight output change the user's prompt?
- Did it cause the user to split the prompt into shots?
- Did it change the user's model choice?
- Did it change whether the user decided to generate at all?

Do not call the main metric "accuracy." The product is not trying to classify prompts in the abstract. It is trying to reduce wasted generation attempts.

If the anti-lottery version improves usable rate from roughly 30% to 45-50%, even on a small sample, the product direction becomes much stronger than a generic portfolio prompt tool.

## 8. What Must Be Proven Before Building More

Before changing the UI or adding new model features, prove these things:

1. The target user exists and runs into this problem frequently.
2. The current workflow wastes credits or time in a way the user cares about.
3. A 30-second preflight can change the user's first generation attempt.
4. A 30-second preflight changes user behavior: prompt wording, shot decomposition, model choice, or decision to generate.
5. The changed prompt or shot plan measurably reduces wasted generations.

If these are not proven, adding more scoring dimensions, model providers, or UI panels will likely make the product look more complex without making it more useful.
