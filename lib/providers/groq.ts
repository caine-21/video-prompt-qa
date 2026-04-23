import Groq from "groq-sdk";
import {
  EVALUATION_SYSTEM_PROMPT,
  COMPARE_SYSTEM_PROMPT,
  buildEvaluationResult,
  buildCompareResult,
} from "./base";
import type { EvaluationResult, CompareResult } from "@/lib/types";

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  return new Groq({ apiKey });
}

export async function evaluateWithGroq(
  prompt: string
): Promise<EvaluationResult> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: EVALUATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Evaluate this video generation prompt:\n\n"${prompt}"`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1024,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(text);
  return buildEvaluationResult(prompt, "groq", parsed);
}

export async function compareWithGroq(
  promptA: string,
  promptB: string
): Promise<CompareResult> {
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
    response_format: { type: "json_object" },
    max_tokens: 512,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(text);
  return buildCompareResult(promptA, promptB, "groq", parsed);
}
