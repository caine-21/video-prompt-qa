import type { EvaluationResult, CompareResult, AIProvider } from "@/lib/types";
import { evaluateWithGemini, compareWithGemini } from "./providers/gemini";
import { evaluateWithClaude, compareWithClaude } from "./providers/claude";
import { evaluateWithGroq, compareWithGroq } from "./providers/groq";

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
