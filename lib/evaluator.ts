import type { EvaluationResult, CompareResult, AIProvider, EvaluationDimension } from "@/lib/types";
import { evaluateWithGemini, compareWithGemini, rewriteWithGemini } from "./providers/gemini";
import { evaluateWithClaude, compareWithClaude, rewriteWithClaude } from "./providers/claude";
import { evaluateWithGroq, compareWithGroq, rewriteWithGroq } from "./providers/groq";

export async function evaluate(
  prompt: string,
  provider: AIProvider = "gemini"
): Promise<EvaluationResult> {
  switch (provider) {
    case "gemini":
      return evaluateWithGemini(prompt);
    case "claude":
      return evaluateWithClaude(prompt);
    case "groq":
      return evaluateWithGroq(prompt);
  }
}

export async function rewrite(
  prompt: string,
  dimensions: EvaluationDimension[],
  improvements: string[],
  provider: AIProvider = "groq"
): Promise<string> {
  switch (provider) {
    case "gemini": return rewriteWithGemini(prompt, dimensions, improvements);
    case "claude": return rewriteWithClaude(prompt, dimensions, improvements);
    case "groq":   return rewriteWithGroq(prompt, dimensions, improvements);
  }
}

export async function compare(
  promptA: string,
  promptB: string,
  provider: AIProvider = "gemini"
): Promise<CompareResult> {
  switch (provider) {
    case "gemini":
      return compareWithGemini(promptA, promptB);
    case "claude":
      return compareWithClaude(promptA, promptB);
    case "groq":
      return compareWithGroq(promptA, promptB);
  }
}
