import type { AIProvider, ProviderEvaluationResult, ProviderCompareResult, ProviderRewriteResult, EvaluationDimension } from "@/lib/types";
import { evaluateWithGroq,     rewriteWithGroq,     compareWithGroq     } from "./groq";
import { evaluateWithDeepSeek, rewriteWithDeepSeek, compareWithDeepSeek } from "./deepseek";

interface ProviderOps {
  evaluate: (prompt: string) => Promise<ProviderEvaluationResult>;
  rewrite: (prompt: string, dims: EvaluationDimension[], improvements: string[]) => Promise<ProviderRewriteResult>;
  compare: (a: string, b: string) => Promise<ProviderCompareResult>;
}

export const PROVIDER_REGISTRY: Record<AIProvider, ProviderOps> = {
  groq:     { evaluate: evaluateWithGroq,     rewrite: rewriteWithGroq,     compare: compareWithGroq     },
  deepseek: { evaluate: evaluateWithDeepSeek, rewrite: rewriteWithDeepSeek, compare: compareWithDeepSeek },
};

export const PROVIDER_CONFIG: Record<AIProvider, { priority: number }> = {
  groq:     { priority: 1 },
  deepseek: { priority: 2 },
};

export const ALL_PROVIDERS = (Object.keys(PROVIDER_REGISTRY) as AIProvider[]).sort(
  (a, b) => PROVIDER_CONFIG[a].priority - PROVIDER_CONFIG[b].priority
);

export function fallbackOrder(primary: AIProvider): AIProvider[] {
  return [primary, ...ALL_PROVIDERS.filter((p) => p !== primary)];
}
