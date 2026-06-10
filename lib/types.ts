export type AIProvider = "gemini" | "claude" | "groq";

export interface EvaluationDimension {
  name: string;
  score: number; // 1-10
  feedback: string;
}

export interface AnatomyComponent {
  component: string;
  status: "present" | "partial" | "absent";
  note: string | null;
}

export interface ModelFitEntry {
  model: string;
  score: number;
  reason: string;
}

export interface EvaluationResult {
  prompt: string;
  provider: AIProvider;
  overallScore: number;
  dimensions: EvaluationDimension[];
  improvements: string[];
  edgeCases: string[];
  anatomy?: AnatomyComponent[];
  modelFit?: ModelFitEntry[];
  negativePrompts?: string[];
  timestamp: string;
  dbId?: string;
}

export interface CompareResult {
  promptA: string;
  promptB: string;
  provider: AIProvider;
  winner: "A" | "B" | "tie";
  reasoning: string;
  scoreA: number;
  scoreB: number;
  timestamp: string;
}

export interface EvaluateRequest {
  prompt: string;
  provider?: AIProvider;
}

export interface CompareRequest {
  promptA: string;
  promptB: string;
  provider?: AIProvider;
}

export interface RewriteRequest {
  prompt: string;
  dimensions: EvaluationDimension[];
  improvements: string[];
  provider?: AIProvider;
}

export type ProviderErrorType = "network" | "rate_limit" | "auth" | "invalid_response" | "unknown";

export interface ProviderError {
  message: string;
  type: ProviderErrorType;
  retryable: boolean;
  raw?: unknown;
}

export type Result<T> =
  | { success: true; data: T; provider: AIProvider }
  | { success: false; error: ProviderError; provider: AIProvider };

export function isErrorResult<T>(r: Result<T>): r is { success: false; error: ProviderError; provider: AIProvider } {
  return r.success === false;
}

/** Only use for non-critical/optional paths — drops the error. Prefer explicit `if (!r.success)` on critical paths. */
export function unwrapResult<T>(r: Result<T>): T | null {
  return r.success ? r.data : null;
}

export function mapResult<T, U>(r: Result<T>, fn: (v: T) => U): Result<U> {
  if (!r.success) return { success: false, error: r.error, provider: r.provider };
  return { success: true, data: fn(r.data), provider: r.provider };
}

export function flatMapResult<T, U>(r: Result<T>, fn: (v: T) => Result<U>): Result<U> {
  if (!r.success) return { success: false, error: r.error, provider: r.provider };
  return fn(r.data);
}

export type ProviderEvaluationResult = Result<EvaluationResult>;
export type ProviderCompareResult = Result<CompareResult>;
export type ProviderRewriteResult = Result<string>;

export type TaskType = "evaluation" | "rewrite" | "compare" | "tournament";
export type OrchestratorStrategy = "fallback" | "race" | "consensus";

export interface TournamentMatchup {
  indexA: number;
  indexB: number;
  winner: "A" | "B" | "tie";
  scoreA: number;
  scoreB: number;
  reasoning: string;
}

export interface TournamentRanking {
  index: number;
  prompt: string;
  wins: number;
  losses: number;
  ties: number;
  avgScore: number;
}

export interface TournamentResult {
  prompts: string[];
  provider: AIProvider;
  matchups: TournamentMatchup[];
  rankings: TournamentRanking[];
  timestamp: string;
}

export interface TournamentRequest {
  prompts: string[];
  provider?: AIProvider;
}

export type FeedbackRating = 1 | 2 | 3; // 1=clearly better, 2=slightly better, 3=no improvement/worse

export type FeedbackTag = "unclear" | "too_generic" | "wrong_focus" | "too_verbose";

export interface HumanFeedback {
  rating: FeedbackRating;
  tags?: FeedbackTag[];
}

export interface HistoryEntry {
  id: string;
  result: EvaluationResult;
  deltaScore?: number;
  feedback?: HumanFeedback;
}
