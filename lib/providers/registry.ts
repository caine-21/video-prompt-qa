import type { AIProvider, ProviderEvaluationResult, ProviderCompareResult, ProviderRewriteResult, EvaluationDimension } from "@/lib/types";
import { evaluateWithGroq, rewriteWithGroq, compareWithGroq } from "./groq";
import { evaluateWithClaude, rewriteWithClaude, compareWithClaude } from "./claude";
import { evaluateWithGemini, rewriteWithGemini, compareWithGemini } from "./gemini";

interface ProviderOps {
  evaluate: (prompt: string) => Promise<ProviderEvaluationResult>;
  rewrite: (prompt: string, dims: EvaluationDimension[], improvements: string[]) => Promise<ProviderRewriteResult>;
  compare: (a: string, b: string) => Promise<ProviderCompareResult>;
}

export const PROVIDER_REGISTRY: Record<AIProvider, ProviderOps> = {
  groq:   { evaluate: evaluateWithGroq,   rewrite: rewriteWithGroq,   compare: compareWithGroq },
  claude: { evaluate: evaluateWithClaude, rewrite: rewriteWithClaude, compare: compareWithClaude },
  gemini: { evaluate: evaluateWithGemini, rewrite: rewriteWithGemini, compare: compareWithGemini },
};

// Priority order for automatic fallback (lower = tried first)
export const PROVIDER_CONFIG: Record<AIProvider, { priority: number }> = {
  groq:   { priority: 1 },
  claude: { priority: 2 },
  gemini: { priority: 3 },
};

export const ALL_PROVIDERS = (Object.keys(PROVIDER_REGISTRY) as AIProvider[]).sort(
  (a, b) => PROVIDER_CONFIG[a].priority - PROVIDER_CONFIG[b].priority
);

export function fallbackOrder(primary: AIProvider): AIProvider[] {
  return [primary, ...ALL_PROVIDERS.filter((p) => p !== primary)];
}
