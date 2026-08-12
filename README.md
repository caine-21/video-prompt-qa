# Video Prompt QA

> Replace prompt intuition with repeatable experiments.

> An experiment in AI evaluation reliability.  
> Designed to discover how AI evaluators fail, not just how prompts perform.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://videopromptqa.netlify.app/) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Key Finding

A prompt with no subject:

> *"A cinematic 4K aerial drone shot with bokeh, golden hour lighting, slow-motion, shallow depth of field."*

received **8.4/10**. Specificity=8. The evaluator was fooled by cinematography vocabulary.

This project started as a prompt evaluator.  
It became an experiment in evaluator reliability.

→ [Full case study](CASE_STUDY.md) · [Adversarial test data](ADVERSARIAL_TESTS.md)

## 🚀 Live Demo

**[Try it live → https://videopromptqa.netlify.app/](https://videopromptqa.netlify.app/)**

> ⚠️ Note: This beta calls a real DeepSeek API. A first response can take roughly 10–20 seconds. No account or payment is required; the anonymous preview is rate-limited to protect the free provider budget.

## Who this is for

- **Real users:** Ad teams, AI video production pipelines, solo creators buying generation credits
- **Repeat task:** Filter 20+ video prompts per day before sending to Pika / Runway / Sora — waste generation is the most common complaint in AI video workflows
- **Pain point:** A bad prompt burns compute, wastes credits, and delays turnaround. Most teams catch this *after* generation. This tool catches it *before*.

## What it does

1. Paste any video prompt
2. Submit the prompt to the DeepSeek evaluator, then compare it with a second prompt head-to-head
3. Get a score across 5 dimensions + specific rewrite suggestions in one bounded DeepSeek request

**5 evaluation dimensions:**

| Dimension | Failure it catches |
|---|---|
| Clarity | Ambiguous subject — model interprets differently each run |
| Specificity | Under-specified — generic, bland output |
| Technical Feasibility | Impossible camera moves or physics |
| Cinematic Quality | Missing shot language — no framing, lighting, mood |
| Creativity | Derivative, low visual interest |

## Design Decisions

- **Why 5 orthogonal dimensions, not a single score:** Each dimension maps to a distinct failure mode. A single score hides which aspect to fix. This forces the user to address the actual root cause.
- **Why model fit is evidence-based:** The evaluator scores prompt-to-model fit against a fixed profile of Sora 2, Veo 3.1, Runway Gen-4.5, and MiniMax Hailuo 2.3. It is a recommendation layer, not a claim that this app calls those generation APIs.
- **Why 18 edge case fixtures:** The evaluation is inherently subjective. The fixtures define the *boundary conditions* — what the system must classify correctly at the edges — and are complemented by automated preflight, observability, and contract tests.

## Quick start

```bash
git clone https://github.com/caine-21/video-prompt-qa
cd video-prompt-qa
npm install
cp .env.local.example .env.local
# Add the evaluator API key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Keys

| Variable | Provider | Free tier |
|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek | ✅ Low cost |

Set `DEEPSEEK_API_KEY` before starting the app.

## Architecture

```
app/page.tsx → app/api/*/route.ts → lib/evaluator.ts → lib/providers/*.ts
                                                      ↑ base.ts (shared prompts — never change per-provider)
lib/types.ts — single source of truth for all shared types
```

**Invariant:** Routes only call `evaluate()` / `compare()` from `lib/evaluator.ts`. Adding a new provider = 4 files, zero changes to routes or UI.

## Part of: AI Content Operations System

This is the **Evaluate** module of a 3-layer AI Content Ops system (Evaluate → Generate → Retrieve). See the [system overview](https://github.com/caine-21/ai-content-ops) for the full architecture.

> The system turns content production from trial-and-error into a controlled pipeline. This module is the *quality gate* — it answers: *how do you know if an AI output is good before spending compute to produce it?*

## Stack

Next.js 16 · TypeScript · Tailwind CSS · DeepSeek API · Supabase
