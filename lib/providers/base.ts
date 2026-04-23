import type { EvaluationResult, CompareResult, AIProvider } from "@/lib/types";

export const EVALUATION_SYSTEM_PROMPT = `You are an expert AI video generation quality engineer.
Evaluate video generation prompts across these dimensions:
1. Clarity (1-10): Is the prompt clear and unambiguous?
2. Specificity (1-10): Does it include enough detail (subject, style, motion, lighting, mood)?
3. Technical Feasibility (1-10): Can current AI video models realistically generate this?
4. Cinematic Quality (1-10): Does it use effective cinematic language?
5. Creativity (1-10): Is it original and visually interesting?

Respond ONLY with valid JSON matching this exact structure:
{
  "dimensions": [
    { "name": "Clarity", "score": <number>, "feedback": "<string>" },
    { "name": "Specificity", "score": <number>, "feedback": "<string>" },
    { "name": "Technical Feasibility", "score": <number>, "feedback": "<string>" },
    { "name": "Cinematic Quality", "score": <number>, "feedback": "<string>" },
    { "name": "Creativity", "score": <number>, "feedback": "<string>" }
  ],
  "improvements": ["<string>", "<string>", "<string>"],
  "edgeCases": ["<string>"]
}`;

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
