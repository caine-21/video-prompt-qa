import type { AIProvider, ProviderErrorType, TaskType, OrchestratorStrategy } from "@/lib/types";

export interface OperationRecord {
  provider: AIProvider;
  task: TaskType;
  strategy: OrchestratorStrategy;
  latencyMs: number;
  success: boolean;
  errorType?: ProviderErrorType;
  score?: number;
  timestamp: number;
}

export interface ProviderStats {
  successRate: number;
  avgLatencyMs: number;
  callCount: number;
  avgScore: number;
}

const records: OperationRecord[] = [];
const MAX_RECORDS = 500;

export function recordOperation(op: OperationRecord): void {
  records.push(op);
  if (records.length > MAX_RECORDS) records.shift();
  console.info("[Metrics]", {
    provider:   op.provider,
    task:       op.task,
    strategy:   op.strategy,
    latencyMs:  op.latencyMs,
    success:    op.success,
    errorType:  op.errorType,
    score:      op.score,
  });
}

export function getProviderStats(): Partial<Record<AIProvider, ProviderStats>> {
  const grouped: Partial<Record<AIProvider, OperationRecord[]>> = {};
  for (const r of records) {
    (grouped[r.provider] ??= []).push(r);
  }

  const stats: Partial<Record<AIProvider, ProviderStats>> = {};
  for (const [provider, ops] of Object.entries(grouped) as [AIProvider, OperationRecord[]][]) {
    const successes  = ops.filter((o) => o.success);
    const scores     = successes.map((o) => o.score).filter((s): s is number => s !== undefined);
    stats[provider]  = {
      callCount:    ops.length,
      successRate:  ops.length > 0 ? successes.length / ops.length : 0,
      avgLatencyMs: ops.reduce((sum, o) => sum + o.latencyMs, 0) / (ops.length || 1),
      avgScore:     scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    };
  }
  return stats;
}

/** Rank providers by success rate then latency — used for dynamic routing */
export function rankedProviders(): AIProvider[] {
  const stats = getProviderStats();
  return (Object.entries(stats) as [AIProvider, ProviderStats][])
    .sort((a, b) => {
      const successDiff = b[1].successRate - a[1].successRate;
      if (Math.abs(successDiff) > 0.05) return successDiff;
      return a[1].avgLatencyMs - b[1].avgLatencyMs;
    })
    .map(([p]) => p);
}
