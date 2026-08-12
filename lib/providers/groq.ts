import {
  EVALUATION_SYSTEM_PROMPT,
  COMPARE_SYSTEM_PROMPT,
  REWRITE_SYSTEM_PROMPT,
  buildEvaluationResult,
  buildCompareResult,
  buildRewriteUserMessage,
  parseRewriteResult,
  fetchWithTimeout,
  DEFAULT_PROVIDER_TIMEOUT_MS,
  safeProviderCall,
} from "./base.ts";
import type { ProviderEvaluationResult, ProviderCompareResult, ProviderRewriteResult } from "@/lib/types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  return key;
}

async function chatComplete(system: string, userContent: string, maxTokens: number, jsonMode = true): Promise<string> {
  const response = await fetchWithTimeout(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    }),
  }, DEFAULT_PROVIDER_TIMEOUT_MS);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const status = response.status;
    if (status === 429) throw Object.assign(new Error("Groq rate limit"), { status });
    if (status === 401 || status === 403) throw Object.assign(new Error("Groq auth error"), { status });
    throw Object.assign(new Error(`Groq error ${status}: ${body.slice(0, 200)}`), { status });
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJson(text: string): unknown {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Groq response");
  return JSON.parse(jsonMatch[0]);
}

export function evaluateWithGroq(prompt: string): Promise<ProviderEvaluationResult> {
  return safeProviderCall(async () => {
    const text = await chatComplete(EVALUATION_SYSTEM_PROMPT, `Evaluate this video generation prompt:\n\n"${prompt}"`, 4096);
    return buildEvaluationResult(prompt, "groq", extractJson(text));
  }, "groq", "evaluation");
}

export function rewriteWithGroq(prompt: string, dimensions: Array<{ name: string; score: number; feedback: string }>, improvements: string[]): Promise<ProviderRewriteResult> {
  return safeProviderCall(async () => {
    const text = await chatComplete(REWRITE_SYSTEM_PROMPT, buildRewriteUserMessage(prompt, dimensions, improvements), 512, false);
    return parseRewriteResult(text);
  }, "groq", "rewrite");
}

export function compareWithGroq(promptA: string, promptB: string): Promise<ProviderCompareResult> {
  return safeProviderCall(async () => {
    const text = await chatComplete(COMPARE_SYSTEM_PROMPT, `Compare these two video generation prompts:\n\nPrompt A: "${promptA}"\n\nPrompt B: "${promptB}"`, 512);
    return buildCompareResult(promptA, promptB, "groq", extractJson(text));
  }, "groq", "compare");
}
