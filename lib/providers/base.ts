import type { EvaluationResult, CompareResult, AIProvider, ProviderError, ProviderErrorType, Result } from "@/lib/types";
import { z } from "zod";

const ERROR_META: Record<ProviderErrorType, { retryable: boolean; message: (provider: string) => string }> = {
  network:             { retryable: true,  message: (p) => `Network error: unable to reach ${p}` },
  timeout:             { retryable: true,  message: (p) => `${p} request timed out` },
  rate_limit:          { retryable: true,  message: (p) => `Rate limit exceeded for ${p}` },
  auth:                { retryable: false, message: (p) => `${p} API key is invalid or missing` },
  missing_config:      { retryable: false, message: (p) => `${p} provider configuration is missing` },
  insufficient_balance:{ retryable: false, message: (p) => `${p} balance or quota is insufficient` },
  invalid_model:       { retryable: false, message: (p) => `${p} model configuration is invalid` },
  upstream_4xx:        { retryable: false, message: (p) => `${p} upstream request was rejected` },
  upstream_5xx:        { retryable: true,  message: (p) => `${p} upstream service failed` },
  invalid_response:    { retryable: true,  message: (p) => `${p} returned an invalid response` },
  runtime:             { retryable: false, message: (p) => `${p} runtime error` },
  unknown:             { retryable: false, message: (p) => `${p} provider error` },
};

export type ProviderAttemptEvent = {
  event: "provider_attempt_started" | "provider_attempt_succeeded" | "provider_attempt_failed" | "provider_retry_scheduled";
  provider: string;
  context: string;
  attempt: number;
  latency_ms?: number;
  error_type?: ProviderErrorType;
  retryable?: boolean;
  retries_remaining?: number;
};

let providerEventObserver: ((event: ProviderAttemptEvent) => void) | undefined;

/** Subscribe to redacted provider-attempt events for incident drills and logs. */
export function setProviderEventObserver(observer: ((event: ProviderAttemptEvent) => void) | undefined): void {
  providerEventObserver = observer;
}

function emitProviderEvent(event: ProviderAttemptEvent): void {
  providerEventObserver?.(event);
  console.info(JSON.stringify({ type: "provider_attempt", ...event }));
}

function classifyError(err: unknown): ProviderErrorType {
  const status = (err as { status?: number })?.status;
  const name = (err as { name?: string })?.name?.toLowerCase() ?? "";
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();

  if (name === "syntaxerror" || name === "zoderror" || msg.includes("no json found") || msg.includes("invalid response") || msg.includes("unexpected token") || msg.includes("cannot read properties of undefined") || msg.includes("not iterable")) return "invalid_response";
  if (msg.includes("api_key is not set") || msg.includes("api key is not set") || msg.includes("missing configuration")) return "missing_config";
  if (name === "aborterror" || msg.includes("timeout") || msg.includes("timed out") || msg.includes("etimedout") || msg.includes("connect_timeout")) return "timeout";
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "auth";
  if (msg.includes("insufficient") || msg.includes("balance") || msg.includes("quota") || msg.includes("credits")) return "insufficient_balance";
  if (msg.includes("model") && (msg.includes("invalid") || msg.includes("not found") || msg.includes("unsupported"))) return "invalid_model";
  if (status && status >= 500) return "upstream_5xx";
  if (status && status >= 400) return "upstream_4xx";

  if (msg.includes("fetch") || msg.includes("network") || msg.includes("econnrefused")) return "network";
  if (msg.includes("json") || msg.includes("json_validate_failed") || msg.includes("invalid response")) return "invalid_response";
  if (msg.includes("429") || msg.includes("rate limit") || msg.includes("resource_exhausted")) return "rate_limit";
  if (msg.includes("401") || msg.includes("403") || msg.includes("api key") || msg.includes("invalid_api_key")) return "auth";
  if (msg.includes("runtime")) return "runtime";
  return "unknown";
}

export function normalizeProviderError(err: unknown, provider: string, context?: string): ProviderError {
  const type = classifyError(err);
  const meta = ERROR_META[type];
  return { type, message: meta.message(provider), retryable: meta.retryable, raw: { err, context } };
}

export function shouldRetry(error: ProviderError): boolean {
  return error.retryable;
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export const DEFAULT_PROVIDER_TIMEOUT_MS = 9_000;
export const DEFAULT_PROVIDER_RETRIES = 1;

/** Abort one upstream request before a serverless function deadline does it for us. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function runWithProviderDeadline<T>(fn: () => Promise<T>, timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error("provider request timed out");
      error.name = "AbortError";
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(fn), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function safeProviderCall<T>(
  fn: () => Promise<T>,
  provider: AIProvider,
  context: string,
  retries = DEFAULT_PROVIDER_RETRIES,
  attempt = 1,
  timeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
): Promise<Result<T>> {
  const startedAt = Date.now();
  emitProviderEvent({ event: "provider_attempt_started", provider, context, attempt });
  try {
    const data = await runWithProviderDeadline(fn, timeoutMs);
    emitProviderEvent({
      event: "provider_attempt_succeeded",
      provider,
      context,
      attempt,
      latency_ms: Date.now() - startedAt,
    });
    return { success: true, data, provider };
  } catch (err) {
    const error = normalizeProviderError(err, provider, context);
    console.warn("[ProviderError]", { provider, context, type: error.type, message: error.message, retryable: error.retryable });
    emitProviderEvent({
      event: "provider_attempt_failed",
      provider,
      context,
      attempt,
      latency_ms: Date.now() - startedAt,
      error_type: error.type,
      retryable: error.retryable,
      retries_remaining: retries,
    });
    if (error.retryable && retries > 0) {
      emitProviderEvent({
        event: "provider_retry_scheduled",
        provider,
        context,
        attempt,
        error_type: error.type,
        retries_remaining: retries - 1,
      });
      await sleep(300 * Math.pow(2, 2 - retries));
      return safeProviderCall(fn, provider, context, retries - 1, attempt + 1, timeoutMs);
    }
    return { success: false, error, provider };
  }
}

export const EVALUATION_SYSTEM_PROMPT = `You are an expert AI video generation quality engineer. Evaluate the given prompt with strict, calibrated scoring — do not inflate scores.

## SCORING SCALE (apply to every dimension)
1–3: Fails entirely — missing the core element, unusable as-is
4–6: Partial — something is there but too vague, generic, or incomplete to guide a model reliably
7–8: Solid — clear and usable, minor gaps that would benefit from improvement
9–10: Production-ready — specific, precise, leaves no room for model misinterpretation

A single-word or 2-word prompt (e.g. "a cat") must score 1–3 on most dimensions. Reserve 8+ for prompts with explicit cinematic language. Never give 7+ unless the prompt explicitly contains that element.

## STEP 1 — SUBJECT DETECTION (run this FIRST, before scoring)

Before assigning any scores, identify whether the prompt has an identifiable subject.

A subject is: a specific person, animal, object, or named scene element that tells the AI model WHAT to generate.
Cinematographic vocabulary (4K, bokeh, golden hour, drone, slow-motion, depth-of-field) describes HOW to film — it is technique, NOT a subject.

Classify the subject:
- PRESENT: a concrete subject is explicitly named (e.g. "a black cat", "an elderly fisherman", "a city skyline at rush hour")
- PARTIAL-PLACEHOLDER: the prompt uses a placeholder word with no referent (e.g. "something", "someone", "a subject", "an object", "a thing", "an element", "whatever")
- ABSENT: no subject exists — only technique, mood, or setting words

HARD RULES — these override your general scoring judgment. Violating them is a grading error:
- If subject is ABSENT: Specificity MUST be ≤ 3 and Clarity MUST be ≤ 4. No exceptions.
- If subject is PARTIAL-PLACEHOLDER: Specificity MUST be ≤ 5. No exceptions.
- Reason: Specificity measures WHAT is being filmed. A prompt that only describes HOW to film cannot score high on WHAT — regardless of how many technical terms it contains.

## DIMENSIONS — score each 1–10

1. Clarity: Is the subject and action unambiguous? Could different people interpret this differently?
2. Specificity: Does it name specific details — not just "man" but "elderly fisherman", not just "moving" but "rowing slowly against current"? (Subject must be PRESENT to score above 3.)
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

## MODEL FIT — evidence-based task fit, rate 1–10 for each model

This is a recommendation score, not a benchmark score and not a claim that the app generated a video with the model. Score the fit between THIS prompt and the model's documented task shape. Do not reward a model merely because it is famous.

Use this rubric:
- 9–10: The prompt explicitly matches the model's supported mode and includes strong evidence for its useful strengths; no material capability gap is visible.
- 7–8: Good fit with one meaningful omission, such as missing reference material, shot boundary, duration, or camera constraint.
- 4–6: Plausible fit, but the prompt is underspecified or the requested workflow is only partially aligned.
- 1–3: Clear task mismatch, unsupported mode/constraint, or a prompt too incomplete to justify a recommendation.

Reference profiles (checked 2026-08):
- Sora 2: general text/image-to-video with synced audio; use when the prompt needs rich scene dynamics, multi-shot continuity, or realistic physical interactions. Do not assume every complex action will succeed.
- Veo 3.1: text/image/reference-oriented generation with documented 4/6/8-second outputs and 16:9 or 9:16 framing; use when the prompt provides a bounded shot and explicit reference/mode constraints.
- Runway Gen-4.5: strong prompt adherence, motion quality, visual fidelity, and controllable generation workflows; use when the prompt specifies cinematic motion, camera intent, or visual treatment.
- MiniMax Hailuo 2.3: text-to-video and image-to-video with documented 6/10-second options and explicit camera-command support; use when the prompt has a compact shot, clear motion, or a first-frame workflow.

If the prompt does not contain enough evidence, score conservatively. Every reason MUST quote or directly reference a specific phrase from the prompt and explain the matching or missing capability. Do not invent a model-specific limitation that is not in the profile above.

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
    { "model": "Sora 2", "score": <number 1-10>, "reason": "<quote prompt evidence and explain the fit or gap>" },
    { "model": "Veo 3.1", "score": <number 1-10>, "reason": "<quote prompt evidence and explain the fit or gap>" },
    { "model": "Runway Gen-4.5", "score": <number 1-10>, "reason": "<quote prompt evidence and explain the fit or gap>" },
    { "model": "MiniMax Hailuo 2.3", "score": <number 1-10>, "reason": "<quote prompt evidence and explain the fit or gap>" }
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
  parsed: unknown
): EvaluationResult {
  const validated = z.object({
    dimensions: z.array(z.object({
      name: z.enum(["Clarity", "Specificity", "Technical Feasibility", "Cinematic Quality", "Creativity"]),
      score: z.number().min(1).max(10),
      feedback: z.string().min(1)
    })).length(5),
    improvements: z.array(z.string().min(1)).max(10),
    edgeCases: z.array(z.string().min(1)).max(10),
    anatomy: z.array(z.object({
      component: z.string().min(1),
      status: z.enum(["present", "partial", "absent"]),
      note: z.string().nullable()
    })).optional(),
    modelFit: z.array(z.object({
      model: z.string().min(1),
      score: z.number().min(1).max(10),
      reason: z.string().min(1)
    })).optional(),
    negativePrompts: z.array(z.string().min(1)).optional()
  }).parse(parsed);
  const overallScore =
    Math.round(
      (validated.dimensions.reduce((sum, d) => sum + d.score, 0) /
        validated.dimensions.length) *
        10
    ) / 10;

  return {
    prompt,
    provider,
    overallScore,
    dimensions: validated.dimensions,
    improvements: validated.improvements,
    edgeCases: validated.edgeCases,
    anatomy: validated.anatomy ?? [],
    modelFit: validated.modelFit ?? [],
    negativePrompts: validated.negativePrompts ?? [],
    timestamp: new Date().toISOString(),
  };
}

export function buildCompareResult(
  promptA: string,
  promptB: string,
  provider: AIProvider,
  parsed: unknown
): CompareResult {
  const validated = z.object({
    winner: z.enum(["A", "B", "tie"]),
    scoreA: z.number().min(1).max(10),
    scoreB: z.number().min(1).max(10),
    reasoning: z.string().min(1)
  }).parse(parsed);
  return {
    promptA,
    promptB,
    provider,
    winner: validated.winner,
    reasoning: validated.reasoning,
    scoreA: validated.scoreA,
    scoreB: validated.scoreB,
    timestamp: new Date().toISOString(),
  };
}

export function parseRewriteResult(value: unknown): string {
  return z.string().trim().min(1).max(8000).parse(value);
}
