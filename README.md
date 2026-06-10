# Video Prompt QA

> Replace prompt intuition with repeatable experiments.

> An experiment in AI evaluation reliability.  
> Designed to discover how AI evaluators fail, not just how prompts perform.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://video-prompt-qa.vercel.app) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Key Finding

A prompt with no subject:

> *"A cinematic 4K aerial drone shot with bokeh, golden hour lighting, slow-motion, shallow depth of field."*

received **8.4/10**. Specificity=8. The evaluator was fooled by cinematography vocabulary.

This project started as a prompt evaluator.  
It became an experiment in evaluator reliability.

→ [Full case study](CASE_STUDY.md) · [Adversarial test data](ADVERSARIAL_TESTS.md)

## 🚀 Live Demo

**[Try it live → https://video-prompt-qa.vercel.app](https://video-prompt-qa.vercel.app)**

> ⚠️ Note: This demo calls real LLM APIs. First response takes 5–10 seconds. No signup required.

## Who this is for

- **Real users:** Ad teams, AI video production pipelines, solo creators buying generation credits
- **Repeat task:** Filter 20+ video prompts per day before sending to Pika / Runway / Sora — waste generation is the most common complaint in AI video workflows
- **Pain point:** A bad prompt burns compute, wastes credits, and delays turnaround. Most teams catch this *after* generation. This tool catches it *before*.

## What it does

1. Paste any video prompt
2. Pick a model (Claude / Gemini / Groq) — or compare two prompts head-to-head
3. Get a score across 5 dimensions + specific rewrite suggestions in ~6 seconds

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
- **Why all three providers share the same system prompt:** To make scores *comparable* — if Claude gives 7/10 and Groq gives 4/10 on the same prompt, the gap is signal about model calibration, not about prompt quality. Shared prompts are required for fair comparison.
- **Why 16 edge case fixtures instead of automated tests:** The evaluation is inherently subjective. The fixtures define the *boundary conditions* — what the system must classify correctly at the edges. They're the spec, not a test suite.

## Quick start

```bash
git clone https://github.com/caine-21/video-prompt-qa
cd video-prompt-qa
npm install
cp .env.local.example .env.local
# Add at least one API key (GROQ_API_KEY is free)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Keys

| Variable | Provider | Free tier |
|---|---|---|
| `GROQ_API_KEY` | Groq Cloud | ✅ Yes |
| `DEEPSEEK_API_KEY` | DeepSeek | ✅ Low cost (~$0.14/1M tokens) |

Set at least one key. GROQ is free and fast — recommended starting point.

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

Next.js 16 · TypeScript · Tailwind CSS · Claude / Gemini / Groq APIs · Supabase
