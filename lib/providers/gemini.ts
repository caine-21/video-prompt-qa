import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  EVALUATION_SYSTEM_PROMPT,
  COMPARE_SYSTEM_PROMPT,
  REWRITE_SYSTEM_PROMPT,
  buildEvaluationResult,
  buildCompareResult,
  buildRewriteUserMessage,
} from "./base";
import type { EvaluationResult, CompareResult } from "@/lib/types";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

export async function evaluateWithGemini(
  prompt: string
): Promise<EvaluationResult> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: EVALUATION_SYSTEM_PROMPT,
  });

  const result = await model.generateContent(
    `Evaluate this video generation prompt:\n\n"${prompt}"`
  );
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Gemini response");
  const parsed = JSON.parse(jsonMatch[0]);
  return buildEvaluationResult(prompt, "gemini", parsed);
}

export async function rewriteWithGemini(
  prompt: string,
  dimensions: Array<{ name: string; score: number; feedback: string }>,
  improvements: string[]
): Promise<string> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: REWRITE_SYSTEM_PROMPT,
  });
  const result = await model.generateContent(
    buildRewriteUserMessage(prompt, dimensions, improvements)
  );
  return result.response.text().trim();
}

export async function compareWithGemini(
  promptA: string,
  promptB: string
): Promise<CompareResult> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: COMPARE_SYSTEM_PROMPT,
  });

  const result = await model.generateContent(
    `Compare these two video generation prompts:\n\nPrompt A: "${promptA}"\n\nPrompt B: "${promptB}"`
  );
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Gemini response");
  const parsed = JSON.parse(jsonMatch[0]);
  return buildCompareResult(promptA, promptB, "gemini", parsed);
}
