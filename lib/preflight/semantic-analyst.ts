import { z } from "zod";
import type { PreflightRequest } from "./contracts.ts";

export const SemanticFindingSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(["AMBIGUITY", "SEMANTIC_CONFLICT", "TEMPORAL_CONTINUITY", "INTENT_RISK", "SEMANTIC_RISK"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNKNOWN"]),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  summary: z.string().min(1).max(1000),
  evidence_excerpt: z.string().min(1).max(1000),
  preventability: z.enum(["PREVENTABLE", "UNCERTAIN"]),
  risk_pattern_ids: z.array(z.string().min(1)).max(12),
  recommended_action: z.string().min(1).max(1000)
}).strict();

export const SemanticAnalysisPayloadSchema = z.object({
  findings: z.array(SemanticFindingSchema).max(8),
  uncertainties: z.array(z.string().trim().min(1).max(500)).max(8),
  suggested_revision: z.string().trim().min(20).max(8000).nullable()
}).strict();

export type SemanticFinding = z.infer<typeof SemanticFindingSchema>;
export type SemanticAnalysisPayload = z.infer<typeof SemanticAnalysisPayloadSchema>;

export interface SemanticRuntimeError {
  domain: "INFRA_ERROR";
  code: "TIMEOUT" | "RATE_LIMIT" | "AUTH" | "MALFORMED_OUTPUT" | "PROVIDER_UNAVAILABLE" | "CONFIG" | "UNKNOWN";
  provider: string;
  message: string;
  retryable: boolean;
}

export interface SemanticAnalysisOutcome extends SemanticAnalysisPayload {
  status: "OK" | "UNAVAILABLE" | "SKIPPED";
  provider: string | null;
  model: string | null;
  provider_calls: number;
  retry_count: number;
  token_usage: number | null;
  errors: SemanticRuntimeError[];
}

export interface SemanticAnalyst {
  analyze(request: PreflightRequest): Promise<SemanticAnalysisOutcome>;
}

export interface SemanticProviderResponse {
  text: string;
  model: string;
  token_usage: number | null;
}

export interface SemanticProvider {
  name: string;
  complete(request: PreflightRequest, signal: AbortSignal): Promise<SemanticProviderResponse>;
}

export interface SemanticAnalystPolicy {
  timeout_ms: number;
  max_provider_calls: number;
  retry_limit: number;
}

export const DEFAULT_SEMANTIC_ANALYST_POLICY: SemanticAnalystPolicy = {
  timeout_ms: 12_000,
  max_provider_calls: 2,
  retry_limit: 0
};

function strictParse(text: string): SemanticAnalysisPayload {
  const parsed = JSON.parse(text);
  return SemanticAnalysisPayloadSchema.parse(parsed);
}

function runtimeError(provider: string, error: unknown): SemanticRuntimeError {
  const value = error as { code?: string; status?: number; name?: string; message?: string };
  const message = error instanceof Error ? error.message : String(error);
  if (value.code === "SEMANTIC_TIMEOUT" || value.name === "AbortError") {
    return { domain: "INFRA_ERROR", code: "TIMEOUT", provider, message, retryable: true };
  }
  if (value.code === "CONFIG") {
    return { domain: "INFRA_ERROR", code: "CONFIG", provider, message, retryable: false };
  }
  if (value.status === 429) {
    return { domain: "INFRA_ERROR", code: "RATE_LIMIT", provider, message, retryable: true };
  }
  if (value.status === 401 || value.status === 403) {
    return { domain: "INFRA_ERROR", code: "AUTH", provider, message, retryable: false };
  }
  if (error instanceof SyntaxError || error instanceof z.ZodError) {
    return { domain: "INFRA_ERROR", code: "MALFORMED_OUTPUT", provider, message, retryable: false };
  }
  if (error instanceof TypeError || /fetch|network|socket|unavailable/i.test(message)) {
    return { domain: "INFRA_ERROR", code: "PROVIDER_UNAVAILABLE", provider, message, retryable: true };
  }
  return { domain: "INFRA_ERROR", code: "UNKNOWN", provider, message, retryable: false };
}

export class BoundedSemanticAnalyst implements SemanticAnalyst {
  private readonly providers: SemanticProvider[];
  private readonly policy: SemanticAnalystPolicy;

  constructor(providers: SemanticProvider[], policy: Partial<SemanticAnalystPolicy> = {}) {
    this.providers = providers;
    this.policy = { ...DEFAULT_SEMANTIC_ANALYST_POLICY, ...policy };
  }

  async analyze(request: PreflightRequest): Promise<SemanticAnalysisOutcome> {
    const errors: SemanticRuntimeError[] = [];
    let calls = 0;

    for (const provider of this.providers) {
      for (let attempt = 0; attempt <= this.policy.retry_limit; attempt += 1) {
        if (calls >= this.policy.max_provider_calls) break;
        calls += 1;
        const controller = new AbortController();
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const deadline = new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => {
            controller.abort();
            reject(Object.assign(
              new Error(`Provider deadline exceeded after ${this.policy.timeout_ms}ms`),
              { code: "SEMANTIC_TIMEOUT" }
            ));
          }, this.policy.timeout_ms);
        });
        try {
          const response = await Promise.race([
            provider.complete(request, controller.signal),
            deadline
          ]);
          const payload = strictParse(response.text);
          return {
            ...payload,
            status: "OK",
            provider: provider.name,
            model: response.model,
            provider_calls: calls,
            retry_count: Math.max(0, calls - 1),
            token_usage: response.token_usage,
            errors
          };
        } catch (error) {
          errors.push(runtimeError(provider.name, error));
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      }
      if (calls >= this.policy.max_provider_calls) break;
    }

    return {
      status: "UNAVAILABLE",
      findings: [],
      uncertainties: [],
      suggested_revision: null,
      provider: null,
      model: null,
      provider_calls: calls,
      retry_count: Math.max(0, calls - 1),
      token_usage: null,
      errors
    };
  }
}
