import type {
  AIProvider,
  EvaluationDimension,
  ProviderEvaluationResult,
  ProviderCompareResult,
  ProviderRewriteResult,
  TaskType,
  OrchestratorStrategy,
  TournamentMatchup,
  TournamentRanking,
  TournamentResult,
  Result,
} from "@/lib/types";
import { PROVIDER_REGISTRY, fallbackOrder, ALL_PROVIDERS } from "./providers/registry";
import { recordOperation } from "./metrics";

// Task-aware default strategies — evaluation needs quality, compare needs speed
const TASK_DEFAULT_STRATEGY: Record<TaskType, OrchestratorStrategy> = {
  evaluation: "consensus",
  rewrite:    "fallback",
  compare:    "race",
  tournament: "fallback",
};

export interface OrchestratorOptions {
  providers?: AIProvider[];
  strategy?: OrchestratorStrategy;
  task?: TaskType;
}

// ── Evaluate ──────────────────────────────────────────────────────────────

export async function orchestrateEvaluate(
  prompt: string,
  options?: OrchestratorOptions
): Promise<ProviderEvaluationResult> {
  const providers = options?.providers ?? ALL_PROVIDERS;
  const task      = options?.task      ?? "evaluation";
  const strategy  = options?.strategy  ?? TASK_DEFAULT_STRATEGY[task];
  const t0        = Date.now();

  const result = await runEvaluate(strategy, providers, prompt);

  recordOperation({
    provider:   result.provider,
    task,
    strategy,
    latencyMs:  Date.now() - t0,
    success:    result.success,
    errorType:  result.success ? undefined : result.error.type,
    score:      result.success ? result.data.overallScore : undefined,
    timestamp:  t0,
  });

  return result;
}

async function runEvaluate(strategy: OrchestratorStrategy, providers: AIProvider[], prompt: string): Promise<ProviderEvaluationResult> {
  switch (strategy) {
    case "fallback":  return fallbackEvaluate(providers, prompt);
    case "race":      return raceEvaluate(providers, prompt);
    case "consensus": return consensusEvaluate(providers, prompt);
  }
}

async function fallbackEvaluate(providers: AIProvider[], prompt: string): Promise<ProviderEvaluationResult> {
  let last: ProviderEvaluationResult = { success: false, provider: providers[0], error: { type: "unknown", message: "All providers failed", retryable: false } };
  for (const p of providers) {
    const r = await PROVIDER_REGISTRY[p].evaluate(prompt);
    if (r.success) return r;
    last = r;
  }
  return last;
}

async function raceEvaluate(providers: AIProvider[], prompt: string): Promise<ProviderEvaluationResult> {
  try {
    return await Promise.any(
      providers.map(async (p) => {
        const r = await PROVIDER_REGISTRY[p].evaluate(prompt);
        if (!r.success) throw r;
        return r;
      })
    );
  } catch {
    return { success: false, provider: providers[0], error: { type: "unknown", message: "All providers failed in race", retryable: false } };
  }
}

async function consensusEvaluate(providers: AIProvider[], prompt: string): Promise<ProviderEvaluationResult> {
  const results  = await Promise.all(providers.map((p) => PROVIDER_REGISTRY[p].evaluate(prompt)));
  const successes = results.filter((r): r is Extract<ProviderEvaluationResult, { success: true }> => r.success);
  if (successes.length === 0) return results[results.length - 1];
  return successes.sort((a, b) => b.data.overallScore - a.data.overallScore)[0];
}

// ── Compare ───────────────────────────────────────────────────────────────

export async function orchestrateCompare(
  promptA: string,
  promptB: string,
  options?: OrchestratorOptions
): Promise<ProviderCompareResult> {
  const providers = options?.providers ?? ALL_PROVIDERS;
  const task      = options?.task      ?? "compare";
  const strategy  = options?.strategy  ?? TASK_DEFAULT_STRATEGY[task];
  const t0        = Date.now();

  let result: ProviderCompareResult;
  if (strategy === "race") {
    try {
      result = await Promise.any(
        providers.map(async (p) => {
          const r = await PROVIDER_REGISTRY[p].compare(promptA, promptB);
          if (!r.success) throw r;
          return r;
        })
      );
    } catch {
      result = { success: false, provider: providers[0], error: { type: "unknown", message: "All providers failed", retryable: false } };
    }
  } else {
    result = { success: false, provider: providers[0], error: { type: "unknown", message: "All providers failed", retryable: false } };
    for (const p of providers) {
      const r = await PROVIDER_REGISTRY[p].compare(promptA, promptB);
      if (r.success) { result = r; break; }
      result = r;
    }
  }

  recordOperation({ provider: result.provider, task, strategy, latencyMs: Date.now() - t0, success: result.success, errorType: result.success ? undefined : result.error.type, timestamp: t0 });
  return result;
}

// ── Tournament ────────────────────────────────────────────────────────────

export async function orchestrateTournament(
  prompts: string[],
  options?: OrchestratorOptions
): Promise<Result<TournamentResult>> {
  const provider = options?.providers?.[0] ?? "groq";
  const t0 = Date.now();

  // Generate all pairs (round-robin)
  const pairs: [number, number][] = [];
  for (let i = 0; i < prompts.length; i++) {
    for (let j = i + 1; j < prompts.length; j++) {
      pairs.push([i, j]);
    }
  }

  // Fan-out: all comparisons in parallel
  const raw = await Promise.all(
    pairs.map(([i, j]) =>
      orchestrateCompare(prompts[i], prompts[j], { providers: options?.providers, task: "compare" })
        .then((r) => ({ i, j, r }))
    )
  );

  const failed = raw.find((m) => !m.r.success);
  if (failed && !failed.r.success) {
    recordOperation({ provider, task: "tournament", strategy: "fallback", latencyMs: Date.now() - t0, success: false, errorType: failed.r.error.type, timestamp: t0 });
    return { success: false, provider, error: failed.r.error };
  }

  const matchups: TournamentMatchup[] = raw.map(({ i, j, r }) => {
    const d = (r as Extract<typeof r, { success: true }>).data;
    return { indexA: i, indexB: j, winner: d.winner, scoreA: d.scoreA, scoreB: d.scoreB, reasoning: d.reasoning };
  });

  const wins   = new Array(prompts.length).fill(0) as number[];
  const losses = new Array(prompts.length).fill(0) as number[];
  const ties   = new Array(prompts.length).fill(0) as number[];
  const scores = prompts.map(() => [] as number[]);

  for (const m of matchups) {
    scores[m.indexA].push(m.scoreA);
    scores[m.indexB].push(m.scoreB);
    if (m.winner === "A")        { wins[m.indexA]++;  losses[m.indexB]++; }
    else if (m.winner === "B")   { wins[m.indexB]++;  losses[m.indexA]++; }
    else                         { ties[m.indexA]++;  ties[m.indexB]++;   }
  }

  const rankings: TournamentRanking[] = prompts
    .map((prompt, i) => ({
      index: i,
      prompt,
      wins:     wins[i],
      losses:   losses[i],
      ties:     ties[i],
      avgScore: scores[i].length
        ? Math.round((scores[i].reduce((s, v) => s + v, 0) / scores[i].length) * 10) / 10
        : 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.avgScore - a.avgScore);

  const result: TournamentResult = { prompts, provider, matchups, rankings, timestamp: new Date().toISOString() };
  recordOperation({ provider, task: "tournament", strategy: "fallback", latencyMs: Date.now() - t0, success: true, timestamp: t0 });
  return { success: true, data: result, provider };
}

// ── Rewrite ───────────────────────────────────────────────────────────────

export async function orchestrateRewrite(
  prompt: string,
  dimensions: EvaluationDimension[],
  improvements: string[],
  options?: OrchestratorOptions
): Promise<ProviderRewriteResult> {
  const providers = options?.providers ?? ALL_PROVIDERS;
  const task      = options?.task      ?? "rewrite";
  const strategy  = options?.strategy  ?? TASK_DEFAULT_STRATEGY[task];
  const t0        = Date.now();

  let result: ProviderRewriteResult = { success: false, provider: providers[0], error: { type: "unknown", message: "All providers failed", retryable: false } };
  for (const p of providers) {
    const r = await PROVIDER_REGISTRY[p].rewrite(prompt, dimensions, improvements);
    if (r.success) { result = r; break; }
    result = r;
  }

  recordOperation({ provider: result.provider, task, strategy, latencyMs: Date.now() - t0, success: result.success, errorType: result.success ? undefined : result.error.type, timestamp: t0 });
  return result;
}
