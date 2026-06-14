# Prompt QA — Chrome Extension

> **The rubric is IP; the platform is runtime.**  
> This extension is the second runtime for the [VideoPromptQA](https://videopromptqa.netlify.app) evaluation engine — same scoring logic, different surface.

---

## Architecture

```
User Prompt
     │
     ▼
Chrome Extension (popup / context menu)
     │  POST /api/evaluate
     ▼
VideoPromptQA API  (videopromptqa.netlify.app)
     │
     ▼
Rubric Engine  (5-dimension LLM-as-judge + Subject Detection Gate)
     │
     ▼
Evaluation Result  (score · warnings · dimension breakdown · improvements)
```

The extension is a **thin client** — zero evaluation logic lives here. All rubric IP stays on the server. Adding a new evaluation capability means deploying to the API; the extension picks it up automatically.

---

## Problem

Video generation credits are expensive. A single generation on Runway or Kling costs 5–10 seconds of compute and can't be undone.

Users typically discover prompt failures **after** generation:

- Subject missing → model invents random content
- Underspecified → generic stock-footage result
- Contradictory constraints → model picks one, silently ignores the other

By that point, the credit is already burned.

---

## Approach

Predict likely failures **before** generation.

Move the evaluation step from *after you click Generate* to *while you're still writing the prompt* — at the point where you can still fix it for free.

---

## Results

Three categories of failure detected:

| Case | Prompt | Issue detected |
|---|---|---|
| Subject Omission | `"cinematic 4K drone shot, golden hour, bokeh"` | Missing subject → Specificity capped at ≤3 |
| Weak Specificity | `"a dog running"` | Has subject but too generic → low Specificity, no false "missing subject" |
| Strong Prompt | `"an elderly fisherman rowing slowly through morning fog, close-up tracking shot, golden hour lighting"` | High score across all dimensions, no warnings |

The system distinguishes between "no subject" and "subject too vague" — not a binary rule check, but a continuous 5-dimension scoring system.

**Key finding from adversarial testing (main project):** The original evaluator scored a subject-less prompt 8.4/10 by rewarding cinematography vocabulary density rather than semantic completeness. The Subject Detection Gate was added after this failure was discovered — this extension surfaces that gate directly in the browser, at the point it matters most.

---

## Install (local development)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select this `extension/` folder
4. Click the extension icon in the toolbar

**Switch environments (localhost ↔ production):**  
Right-click extension icon → **Options** → change API Base URL → Save. No code change or reload needed.

---

## Features

- **Popup:** Manual prompt evaluation — paste prompt, click Evaluate, see score + warnings + dimension breakdown
- **Context menu:** Select any text on any page → right-click → "Evaluate Prompt" → result waiting in popup (badge shows score)
- **Environments:** Settings page lets you switch between production / localhost / preview deployments without touching code

---

## Future Work (Phase 3)

- **Site injection:** Detect the prompt input field on Runway / Kling and show the score inline, before the Generate button
- **Known limitation:** DOM injection is fragile — site redesigns break selectors. The current popup + context menu approach is intentionally site-agnostic to avoid this
- The injection layer is listed as future work, not because it's hard, but because the right time to build it is after the API and user path are validated stable

---

## Relationship to Main Project

This extension is `video-prompt-qa/extension/` — same repository as the evaluation backend. The Gen 1 → Gen 2 → Gen 3 progression:

| Generation | Surface | User action |
|---|---|---|
| Gen 1 (web app) | videopromptqa.netlify.app | Copy-paste prompt into the app |
| Gen 2 (this extension) | Any browser tab | Right-click selected text / open popup |
| Gen 3 (planned) | Runway / Kling input field | Inline score before you click Generate |

Same rubric IP. Three runtimes.
