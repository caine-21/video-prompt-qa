# VideoPromptQA

AI-powered quality testing tool for video generation prompts. Evaluate prompts across 5 quality dimensions, get actionable improvement suggestions, and compare prompts head-to-head — all powered by your choice of AI provider.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![Next.js](https://img.shields.io/badge/Next.js-15-black) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)

## Features

- **Evaluate** — Score any video prompt across 5 dimensions: Clarity, Specificity, Technical Feasibility, Cinematic Quality, and Creativity
- **Compare A vs B** — Submit two prompts and get a winner with detailed reasoning
- **Improvement suggestions** — Actionable tips to make every prompt better
- **Edge case detection** — Flag prompts that are ambiguous, too vague, or likely to fail
- **Multi-provider** — Switch between Gemini, Claude, and Groq with one click; designed for easy extensibility

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| AI Providers | Google Gemini, Anthropic Claude, Groq |
| API | Next.js Route Handlers |

## Quick Start

**1. Clone and install**
```bash
git clone https://github.com/your-username/video-prompt-qa
cd video-prompt-qa
npm install
```

**2. Add your API key**
```bash
cp .env.local.example .env.local
# Edit .env.local and set GEMINI_API_KEY (free at aistudio.google.com)
```

**3. Run**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | For Gemini | Google AI Studio key |
| `ANTHROPIC_API_KEY` | For Claude | Anthropic API key |
| `GROQ_API_KEY` | For Groq | Groq Cloud key |

Set at least one. Get a free Gemini key at [aistudio.google.com](https://aistudio.google.com).

## Project Structure

```
video-prompt-qa/
├── app/
│   ├── api/
│   │   ├── evaluate/route.ts   # POST /api/evaluate
│   │   └── compare/route.ts    # POST /api/compare
│   ├── layout.tsx
│   └── page.tsx                # Main UI
├── components/
│   ├── EvaluatePanel.tsx
│   ├── ComparePanel.tsx
│   ├── EvaluationReport.tsx
│   └── CompareReport.tsx
└── lib/
    ├── types.ts                 # Shared TypeScript types
    ├── evaluator.ts             # Provider router
    └── providers/
        ├── base.ts              # Shared prompts + result builders
        ├── gemini.ts
        ├── claude.ts
        └── groq.ts
```

## Adding a New Provider

1. Create `lib/providers/yourprovider.ts` implementing `evaluate()` and `compare()`
2. Add a case in `lib/evaluator.ts`
3. Add the button in `app/page.tsx`

The provider abstraction keeps all AI-specific code isolated — swapping or adding providers requires no changes to the UI or API routes.

## Example Prompts

**Good prompt:**
> A lone astronaut walks across a red Martian landscape at sunset, dust swirling around boots, cinematic wide shot, shallow depth of field

**Weak prompt:**
> cat

Use the **Compare A vs B** tab to see the quality difference in detail.
