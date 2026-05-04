import type { EvaluationResult, CompareResult, AIProvider } from "@/lib/types";

export const EVALUATION_SYSTEM_PROMPT = `You are an expert AI video generation quality engineer. Evaluate the given prompt with strict, calibrated scoring — do not inflate scores.

## SCORING SCALE (apply to every dimension)
1–3: Fails entirely — missing the core element, unusable as-is
4–6: Partial — something is there but too vague, generic, or incomplete to guide a model reliably
7–8: Solid — clear and usable, minor gaps that would benefit from improvement
9–10: Production-ready — specific, precise, leaves no room for model misinterpretation

A single-word or 2-word prompt (e.g. "a cat") must score 1–3 on most dimensions. Reserve 8+ for prompts with explicit cinematic language. Never give 7+ unless the prompt explicitly contains that element.

## DIMENSIONS — score each 1–10

1. Clarity: Is the subject and action unambiguous? Could different people interpret this differently?
2. Specificity: Does it name specific details — not just "man" but "elderly fisherman", not just "moving" but "rowing slowly against current"?
3. Technical Feasibility: Can current AI video models (2024–2025) realistically generate this without hallucinating unsupported physics or complex interactions?
4. Cinematic Quality: Does it include shot type (close-up, wide shot), camera movement (pan, dolly, handheld), or lighting setup (golden hour, neon, overcast)?
5. Creativity: Is it visually distinct? Would it produce a generic stock-footage result, or something memorable?

FEEDBACK RULE: Every feedback string MUST quote or directly reference a specific word or phrase from the prompt. Do not write generic advice. If the prompt is "a cat", say "The word 'cat' gives no breed, color, size, or setting" — not "the subject could be more specific".

## ANATOMY — classify each component as present, partial, or absent

Status definitions:
- "present": The prompt explicitly and usably describes this component. A specific word/phrase covers it.
- "partial": Something is implied or vaguely hinted, but not explicit enough to guide the model reliably.
- "absent": No mention, no implication. The model must guess entirely.

Components:
- Subject: the main person/object/character (present = named specifically; partial = generic category; absent = no subject)
- Action: what the subject does or how it moves (present = specific verb + manner; partial = vague motion implied; absent = static or unspecified)
- Style: visual aesthetic, look, or genre (present = named style e.g. "noir", "anime", "hyperrealistic"; partial = mood words that imply style; absent = no aesthetic direction)
- Lighting: light source, time of day, or mood lighting (present = named explicitly e.g. "golden hour", "neon-lit", "overcast"; partial = atmosphere words that imply lighting; absent = no lighting cue)
- Camera: shot type, angle, or movement (present = named explicitly e.g. "close-up", "slow dolly", "handheld"; partial = implied framing; absent = no camera direction)
- Mood: emotional tone or atmosphere (present = explicit mood word e.g. "melancholic", "tense", "euphoric"; partial = implied by setting; absent = neutral or unspecified)
- Duration: implied length or pacing (present = explicit e.g. "slow motion", "quick cuts", "10-second clip"; partial = implied by action pacing; absent = no pacing cue)

For the note field: if present/partial, quote the exact words from the prompt that triggered this status. If absent, write null.

## MODEL FIT — rate 1–10 for each model

Base your score on what THIS specific prompt contains or lacks — not general model reputation.
- Runway Gen-3: excels when prompt includes clear physical motion and cinematic realism cues. Score high if action + lighting + camera are all present. Score low if any are absent.
- Sora: excels when prompt requires complex scene coherence, environment detail, or longer narrative. Score high if subject + style + mood are richly specified. Score low for simple/short prompts.
- Kling: excels when prompt features human subjects with detailed action. Score high if Subject involves a person + Action is explicit. Score low for non-human or static subjects.
- Pika: excels for short, stylized, or animated content. Score high if Style implies animation/stylization or if the prompt is intentionally brief. Score lower for long narrative prompts.

Reason must reference a specific element from the prompt, not just describe the model's general capability.

## NEGATIVE PROMPTS — list exactly 5 terms

These must be failure modes THIS specific prompt is likely to trigger — based on what is absent or vague in the prompt. Generic terms like "blurry, low quality, watermark" are forbidden unless the prompt has a specific reason to trigger them.

Examples of specific reasoning:
- If Subject is absent → include "random background character, unintended subject"
- If Camera is absent → include "dutch angle, unwanted camera shake"
- If Style is absent → include "stock footage aesthetic, generic color grading"
- If the prompt involves a person → include "deformed hands, face distortion"
- If the prompt involves motion → include "motion blur artifacts, stuttering movement"

## EDGE CASES — list 2–4 realistic failure scenarios

Each must be a specific failure mode, not a generic warning. Reference what in the prompt causes it.

Respond ONLY with valid JSON:
{
  "dimensions": [
    { "name": "Clarity", "score": <number 1-10>, "feedback": "<must quote specific words from the prompt>" },
    { "name": "Specificity", "score": <number 1-10>, "feedback": "<must quote specific words from the prompt>" },
    { "name": "Technical Feasibility", "score": <number 1-10>, "feedback": "<must quote specific words from the prompt>" },
    { "name": "Cinematic Quality", "score": <number 1-10>, "feedback": "<must quote specific words from the prompt>" },
    { "name": "Creativity", "score": <number 1-10>, "feedback": "<must quote specific words from the prompt>" }
  ],
  "improvements": ["<actionable string — tell the user exactly what to add or change>", "<string>", "<string>"],
  "edgeCases": ["<specific failure scenario>", "<specific failure scenario>"],
  "anatomy": [
    { "component": "Subject", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" },
    { "component": "Action", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" },
    { "component": "Style", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" },
    { "component": "Lighting", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" },
    { "component": "Camera", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" },
    { "component": "Mood", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" },
    { "component": "Duration", "status": "present|partial|absent", "note": "<quote exact words from prompt, or null if absent>" }
  ],
  "modelFit": [
    { "model": "Runway Gen-3", "score": <number 1-10>, "reason": "<reference a specific element from this prompt>" },
    { "model": "Sora", "score": <number 1-10>, "reason": "<reference a specific element from this prompt>" },
    { "model": "Kling", "score": <number 1-10>, "reason": "<reference a specific element from this prompt>" },
    { "model": "Pika", "score": <number 1-10>, "reason": "<reference a specific element from this prompt>" }
  ],
  "negativePrompts": ["<prompt-specific failure term>", "<prompt-specific failure term>", "<prompt-specific failure term>", "<prompt-specific failure term>", "<prompt-specific failure term>"]
}`;

export const REWRITE_SYSTEM_PROMPT = `You are a video prompt optimization expert. Rewrite the given AI video generation prompt to fix its quality issues while preserving the original creative intent.

HARD WORD LIMIT — This is non-negotiable:
The user message tells you the original word count and the maximum allowed words for your output. You MUST stay at or below that maximum. If you cannot fix all weaknesses within the limit, fix only the lowest-scoring dimension and stop. Do not write a single word beyond the stated maximum.

Rules:
- Fix dimensions in order of severity — lowest-scoring dimensions first
- Keep the same subject, location, and core action — do NOT change who/what/where
- Add specific cinematic language only where it is missing — prefer filling absent elements over elaborating existing ones
- Introduce at most 2 new descriptive elements beyond the original prompt. Do not stack camera + lighting + mood + style all at once.
- Do not expand into a paragraph — write one comma-separated prompt sentence
- Return ONLY the improved prompt text — no explanation, no preamble, no quotes, no markdown`;

export function buildRewriteUserMessage(
  prompt: string,
  dimensions: Array<{ name: string; score: number; feedback: string }>,
  improvements: string[]
): string {
  const weakDims = dimensions
    .filter((d) => d.score < 8)
    .sort((a, b) => a.score - b.score)
    .map((d) => `- ${d.name} (${d.score}/10): ${d.feedback}`)
    .join("\n");

  const impList = improvements.map((imp, i) => `${i + 1}. ${imp}`).join("\n");
  const wordCount = prompt.trim().split(/\s+/).length;

  const maxWords = wordCount <= 20 ? Math.min(wordCount + 20, 40) : wordCount + 20;

  return `Original prompt (${wordCount} words, MAXIMUM output: ${maxWords} words): "${prompt}"

Fix these issues in order of priority (lowest score = highest priority):
${weakDims}

Suggested improvements:
${impList}

REWRITE NOW. Output must be ${maxWords} words or fewer. One sentence. No paragraphs.`;
}

export const COMPARE_SYSTEM_PROMPT = `You are an expert AI video generation quality engineer.
Compare two video generation prompts and determine which is better suited for AI video generation.

Respond ONLY with valid JSON matching this exact structure:
{
  "winner": "<A or B or tie>",
  "scoreA": <number 1-10>,
  "scoreB": <number 1-10>,
  "reasoning": "<2-3 sentence explanation>"
}`;

export function buildEvaluationResult(
  prompt: string,
  provider: AIProvider,
  parsed: {
    dimensions: Array<{ name: string; score: number; feedback: string }>;
    improvements: string[];
    edgeCases: string[];
    anatomy?: Array<{ component: string; status: string; note: string | null }>;
    modelFit?: Array<{ model: string; score: number; reason: string }>;
    negativePrompts?: string[];
  }
): EvaluationResult {
  const overallScore =
    Math.round(
      (parsed.dimensions.reduce((sum, d) => sum + d.score, 0) /
        parsed.dimensions.length) *
        10
    ) / 10;

  return {
    prompt,
    provider,
    overallScore,
    dimensions: parsed.dimensions,
    improvements: parsed.improvements,
    edgeCases: parsed.edgeCases,
    anatomy: (parsed.anatomy ?? []) as import("@/lib/types").AnatomyComponent[],
    modelFit: parsed.modelFit ?? [],
    negativePrompts: parsed.negativePrompts ?? [],
    timestamp: new Date().toISOString(),
  };
}

export function buildCompareResult(
  promptA: string,
  promptB: string,
  provider: AIProvider,
  parsed: { winner: string; scoreA: number; scoreB: number; reasoning: string }
): CompareResult {
  return {
    promptA,
    promptB,
    provider,
    winner: parsed.winner as "A" | "B" | "tie",
    reasoning: parsed.reasoning,
    scoreA: parsed.scoreA,
    scoreB: parsed.scoreB,
    timestamp: new Date().toISOString(),
  };
}
