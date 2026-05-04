import Anthropic from "@anthropic-ai/sdk";
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey });
}

export async function evaluateWithClaude(
  prompt: string
): Promise<EvaluationResult> {
  const client = getClient();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: EVALUATION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Evaluate this video generation prompt:\n\n"${prompt}"`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Claude response");
  const parsed = JSON.parse(jsonMatch[0]);
  return buildEvaluationResult(prompt, "claude", parsed);
}

export async function rewriteWithClaude(
  prompt: string,
  dimensions: Array<{ name: string; score: number; feedback: string }>,
  improvements: string[]
): Promise<string> {
  const client = getClient();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: REWRITE_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildRewriteUserMessage(prompt, dimensions, improvements) },
    ],
  });
  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return text.trim();
}

export async function compareWithClaude(
  promptA: string,
  promptB: string
): Promise<CompareResult> {
  const client = getClient();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: COMPARE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Compare these two video generation prompts:\n\nPrompt A: "${promptA}"\n\nPrompt B: "${promptB}"`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Claude response");
  const parsed = JSON.parse(jsonMatch[0]);
  return buildCompareResult(promptA, promptB, "claude", parsed);
}
