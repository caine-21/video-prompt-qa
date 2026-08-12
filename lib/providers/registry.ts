import type { AIProvider, ProviderEvaluationResult, ProviderCompareResult, ProviderRewriteResult, EvaluationDimension } from "@/lib/types";
import { evaluateWithDeepSeek, rewriteWithDeepSeek, compareWithDeepSeek } from "./deepseek.ts";

interface ProviderOps {
  evaluate: (prompt: string) => Promise<ProviderEvaluationResult>;
  rewrite: (prompt: string, dims: EvaluationDimension[], improvements: string[]) => Promise<ProviderRewriteResult>;
  compare: (a: string, b: string) => Promise<ProviderCompareResult>;
}

export const PROVIDER_REGISTRY: Record<AIProvider, ProviderOps> = {
  deepseek: { evaluate: evaluateWithDeepSeek, rewrite: rewriteWithDeepSeek, compare: compareWithDeepSeek },
};

export const PROVIDER_CONFIG: Record<AIProvider, { priority: number }> = {
  deepseek: { priority: 1 },
};

export const ALL_PROVIDERS = (Object.keys(PROVIDER_REGISTRY) as AIProvider[]).sort(
  (a, b) => PROVIDER_CONFIG[a].priority - PROVIDER_CONFIG[b].priority
);

export function fallbackOrder(primary: AIProvider): AIProvider[] {
  return [primary, ...ALL_PROVIDERS.filter((p) => p !== primary)];
}
