import type { AIProvider, EvaluationDimension, ProviderEvaluationResult, ProviderCompareResult, ProviderRewriteResult, TournamentResult, Result } from "@/lib/types";
import { orchestrateEvaluate, orchestrateCompare, orchestrateRewrite, orchestrateTournament } from "./orchestrator";
import { fallbackOrder } from "./providers/registry";

export function evaluate(prompt: string, provider: AIProvider = "groq"): Promise<ProviderEvaluationResult> {
  return orchestrateEvaluate(prompt, { providers: fallbackOrder(provider), task: "evaluation" });
}

export function compare(promptA: string, promptB: string, provider: AIProvider = "groq"): Promise<ProviderCompareResult> {
  return orchestrateCompare(promptA, promptB, { providers: fallbackOrder(provider), task: "compare" });
}

export function rewrite(prompt: string, dimensions: EvaluationDimension[], improvements: string[], provider: AIProvider = "groq"): Promise<ProviderRewriteResult> {
  return orchestrateRewrite(prompt, dimensions, improvements, { providers: fallbackOrder(provider), task: "rewrite" });
}

export function tournament(prompts: string[], provider: AIProvider = "groq"): Promise<Result<TournamentResult>> {
  return orchestrateTournament(prompts, { providers: fallbackOrder(provider), task: "tournament" });
}
