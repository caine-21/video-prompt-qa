import Groq from "groq-sdk";
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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  return new Groq({ apiKey });
}

export function evaluateWithGroq(prompt: string): Promise<ProviderEvaluationResult> {
  return safeProviderCall(async () => {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: EVALUATION_SYSTEM_PROMPT },
        { role: "user", content: `Evaluate this video generation prompt:\n\n"${prompt}"` },
      ],
      max_tokens: 4096,
    });
    const text = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Groq response");
    return buildEvaluationResult(prompt, "groq", JSON.parse(jsonMatch[0]));
  }, "groq", "evaluation");
}

export function rewriteWithGroq(
  prompt: string,
  dimensions: Array<{ name: string; score: number; feedback: string }>,
  improvements: string[]
): Promise<ProviderRewriteResult> {
  return safeProviderCall(async () => {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: REWRITE_SYSTEM_PROMPT },
        { role: "user", content: buildRewriteUserMessage(prompt, dimensions, improvements) },
      ],
      max_tokens: 512,
    });
    return (completion.choices[0]?.message?.content ?? "").trim();
  }, "groq", "rewrite");
}

export function compareWithGroq(promptA: string, promptB: string): Promise<ProviderCompareResult> {
  return safeProviderCall(async () => {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: COMPARE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Compare these two video generation prompts:\n\nPrompt A: "${promptA}"\n\nPrompt B: "${promptB}"`,
        },
      ],
      max_tokens: 512,
    });
    const text = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Groq response");
    return buildCompareResult(promptA, promptB, "groq", JSON.parse(jsonMatch[0]));
  }, "groq", "compare");
}
