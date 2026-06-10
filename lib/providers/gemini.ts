import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  EVALUATION_SYSTEM_PROMPT,
  COMPARE_SYSTEM_PROMPT,
  REWRITE_SYSTEM_PROMPT,
  buildEvaluationResult,
  buildCompareResult,
  buildRewriteUserMessage,
  safeProviderCall,
} from "./base";
import type { ProviderEvaluationResult, ProviderCompareResult, ProviderRewriteResult } from "@/lib/types";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

function extractFromGeminiError(err: unknown): string | null {
  const s = String(err);
  const match = s.match(/"failed_generation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!match) return null;
  return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

export function evaluateWithGemini(prompt: string): Promise<ProviderEvaluationResult> {
  return safeProviderCall(async () => {
    const model = getClient().getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: EVALUATION_SYSTEM_PROMPT });
    let text: string;
    try {
      text = (await model.generateContent(`Evaluate this video generation prompt:\n\n"${prompt}"`)).response.text().trim();
    } catch (err) {
      const rescued = extractFromGeminiError(err);
      if (!rescued) throw err;
      text = rescued;
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Gemini response");
    return buildEvaluationResult(prompt, "gemini", JSON.parse(jsonMatch[0]));
  }, "gemini", "evaluation");
}

export function rewriteWithGemini(
  prompt: string,
  dimensions: Array<{ name: string; score: number; feedback: string }>,
  improvements: string[]
): Promise<ProviderRewriteResult> {
  return safeProviderCall(async () => {
    const model = getClient().getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: REWRITE_SYSTEM_PROMPT });
    return (await model.generateContent(buildRewriteUserMessage(prompt, dimensions, improvements))).response.text().trim();
  }, "gemini", "rewrite");
}

export function compareWithGemini(promptA: string, promptB: string): Promise<ProviderCompareResult> {
  return safeProviderCall(async () => {
    const model = getClient().getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: COMPARE_SYSTEM_PROMPT });
    const text = (await model.generateContent(
      `Compare these two video generation prompts:\n\nPrompt A: "${promptA}"\n\nPrompt B: "${promptB}"`
    )).response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Gemini response");
    return buildCompareResult(promptA, promptB, "gemini", JSON.parse(jsonMatch[0]));
  }, "gemini", "compare");
}
