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

export interface HistoryEntry {
  id: string;
  result: EvaluationResult;
}
