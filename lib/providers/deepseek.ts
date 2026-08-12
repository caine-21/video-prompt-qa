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

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL   = "deepseek-v4-flash";

export function buildDeepSeekRequestBody(
  system: string,
  userContent: string,
  maxTokens: number,
  jsonMode = true,
): Record<string, unknown> {
  return {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    max_tokens: maxTokens,
    // This is a bounded scoring/rewrite pipeline, not an open-ended reasoning task.
    // Explicitly disable V4 Flash thinking to keep the provider within the route budget.
    thinking: { type: "disabled" },
    // rewrite returns plain text — json_object mode makes DeepSeek reject non-JSON output
    ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  };
}

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not set");
  return key;
}

async function chatComplete(
  system: string,
  userContent: string,
  maxTokens: number,
  jsonMode = true
): Promise<string> {
  const res = await fetchWithTimeout(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(buildDeepSeekRequestBody(system, userContent, maxTokens, jsonMode)),
  }, DEFAULT_PROVIDER_TIMEOUT_MS);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const status = res.status;
    if (status === 429) throw Object.assign(new Error("DeepSeek rate limit"), { status });
    if (status === 401 || status === 403) throw Object.assign(new Error("DeepSeek auth error"), { status });
    throw Object.assign(new Error(`DeepSeek error ${status}: ${body.slice(0, 200)}`), { status });
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export function evaluateWithDeepSeek(prompt: string): Promise<ProviderEvaluationResult> {
  return safeProviderCall(async () => {
    const text = await chatComplete(
      EVALUATION_SYSTEM_PROMPT,
      `Evaluate this video generation prompt:\n\n"${prompt}"`,
      4096
    );
    return buildEvaluationResult(prompt, "deepseek", JSON.parse(text));
  }, "deepseek", "evaluation");
}

export function rewriteWithDeepSeek(
  prompt: string,
  dimensions: Array<{ name: string; score: number; feedback: string }>,
  improvements: string[]
): Promise<ProviderRewriteResult> {
  return safeProviderCall(async () => {
    const text = await chatComplete(
      REWRITE_SYSTEM_PROMPT,
      buildRewriteUserMessage(prompt, dimensions, improvements),
      512,
      false
    );
    return parseRewriteResult(text);
  }, "deepseek", "rewrite");
}

export function compareWithDeepSeek(promptA: string, promptB: string): Promise<ProviderCompareResult> {
  return safeProviderCall(async () => {
    const text = await chatComplete(
      COMPARE_SYSTEM_PROMPT,
      `Compare these two video generation prompts:\n\nPrompt A: "${promptA}"\n\nPrompt B: "${promptB}"`,
      512
    );
    return buildCompareResult(promptA, promptB, "deepseek", JSON.parse(text));
  }, "deepseek", "compare");
}
