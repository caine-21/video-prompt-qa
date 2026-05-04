import type { EvaluationResult, CompareResult, AIProvider } from "@/lib/types";

export const EVALUATION_SYSTEM_PROMPT = `You are an expert AI video generation quality engineer.

Evaluate video generation prompts across these 5 dimensions:
1. Clarity (1-10): Is the prompt clear and unambiguous?
2. Specificity (1-10): Does it include enough detail (subject, style, motion, lighting, mood)?
3. Technical Feasibility (1-10): Can current AI video models realistically generate this?
4. Cinematic Quality (1-10): Does it use effective cinematic language?
5. Creativity (1-10): Is it original and visually interesting?

Also analyze:

ANATOMY — For each of the 7 components, determine status: "present", "partial", or "absent".
- Subject: the main person/object/character
- Action: what the subject does or how it moves
- Style: visual aesthetic, look, or genre
- Lighting: light source, time of day, or mood lighting
- Camera: shot type, angle, or camera movement
- Mood: emotional tone or atmosphere
- Duration: implied length or pacing hints

MODEL FIT — Rate (1-10) how well this prompt suits each model with a 1-sentence reason:
- Runway Gen-3: cinematic realism, smooth motion, strong at physical actions
- Sora: complex scene understanding, long coherent videos, rich environment
- Kling: human motion fidelity, realistic people and faces
- Pika: short stylized clips, animated looks, fast turnaround

NEGATIVE PROMPTS — List 5 specific terms/phrases the user should add to their negative prompt field to avoid common failure modes for this specific prompt.

Respond ONLY with valid JSON:
{
  "dimensions": [
    { "name": "Clarity", "score": <number 1-10>, "feedback": "<string>" },
    { "name": "Specificity", "score": <number 1-10>, "feedback": "<string>" },
    { "name": "Technical Feasibility", "score": <number 1-10>, "feedback": "<string>" },
    { "name": "Cinematic Quality", "score": <number 1-10>, "feedback": "<string>" },
    { "name": "Creativity", "score": <number 1-10>, "feedback": "<string>" }
  ],
  "improvements": ["<string>", "<string>", "<string>"],
  "edgeCases": ["<string>"],
  "anatomy": [
    { "component": "Subject", "status": "present|partial|absent", "note": "<brief description or null>" },
    { "component": "Action", "status": "present|partial|absent", "note": "<brief description or null>" },
    { "component": "Style", "status": "present|partial|absent", "note": "<brief description or null>" },
    { "component": "Lighting", "status": "present|partial|absent", "note": "<brief description or null>" },
    { "component": "Camera", "status": "present|partial|absent", "note": "<brief description or null>" },
    { "component": "Mood", "status": "present|partial|absent", "note": "<brief description or null>" },
    { "component": "Duration", "status": "present|partial|absent", "note": "<brief description or null>" }
  ],
  "modelFit": [
    { "model": "Runway Gen-3", "score": <number 1-10>, "reason": "<1 sentence>" },
    { "model": "Sora", "score": <number 1-10>, "reason": "<1 sentence>" },
    { "model": "Kling", "score": <number 1-10>, "reason": "<1 sentence>" },
    { "model": "Pika", "score": <number 1-10>, "reason": "<1 sentence>" }
  ],
  "negativePrompts": ["<term>", "<term>", "<term>", "<term>", "<term>"]
}`;

export const REWRITE_SYSTEM_PROMPT = `You are a video prompt optimization expert. Rewrite the given AI video generation prompt to fix its quality issues while preserving the original creative intent.

Rules:
- Address every weakness mentioned in the dimension feedback
- Keep the same subject, mood, and creative vision
- Add specific cinematic language: shot type, lighting, camera movement, pacing
- Make it concrete and unambiguous
- Return ONLY the improved prompt text — no explanation, no preamble, no quotes`;

export function buildRewriteUserMessage(
  prompt: string,
  dimensions: Array<{ name: string; score: number; feedback: string }>,
  improvements: string[]
): string {
  const weakDims = dimensions
    .filter((d) => d.score < 8)
    .map((d) => `- ${d.name} (${d.score}/10): ${d.feedback}`)
    .join("\n");

  const impList = improvements.map((imp, i) => `${i + 1}. ${imp}`).join("\n");

  return `Original prompt: "${prompt}"

Issues to fix:
${weakDims}

Suggested improvements:
${impList}

Rewrite the prompt to address these issues.`;
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
