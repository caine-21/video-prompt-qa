import { createClient } from "@supabase/supabase-js";
import type { EvaluationResult } from "@/lib/types";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function logEvaluation(result: EvaluationResult): Promise<string | null> {
  const db = getClient();
  if (!db) return null;
  try {
    const { data, error } = await db.from("evaluations").insert({
      prompt:          result.prompt,
      provider:        result.provider,
      overall_score:   result.overallScore,
      dimensions:      result.dimensions,
      improvements:    result.improvements,
      edge_cases:      result.edgeCases,
      anatomy:         result.anatomy ?? null,
      model_fit:       result.modelFit ?? null,
      negative_prompts: result.negativePrompts ?? null,
      created_at:      result.timestamp,
    }).select("id").single();
    if (error) return null;
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function logFeedback(
  evaluationId: string,
  rating: number,
  tags: string[],
  deltaScore: number | undefined
): Promise<void> {
  const db = getClient();
  if (!db || !evaluationId) return;
  try {
    await db.from("feedback").insert({
      evaluation_id: evaluationId,
      rating,
      tags,
      delta_score: deltaScore ?? null,
    });
  } catch { /* non-fatal */ }
}

export async function getStats() {
  const db = getClient();
  if (!db) return null;
  try {
    const { data: evals } = await db
      .from("evaluations")
      .select("overall_score, provider, created_at");

    const { data: feedbacks } = await db
      .from("feedback")
      .select("rating, delta_score, tags");

    if (!evals) return null;

    const total      = evals.length;
    const avgScore   = total > 0
      ? Math.round((evals.reduce((s, e) => s + e.overall_score, 0) / total) * 10) / 10
      : 0;

    const byProvider: Record<string, { count: number; avg: number }> = {};
    for (const e of evals) {
      if (!byProvider[e.provider]) byProvider[e.provider] = { count: 0, avg: 0 };
      byProvider[e.provider].count++;
      byProvider[e.provider].avg += e.overall_score;
    }
    for (const k of Object.keys(byProvider)) {
      byProvider[k].avg = Math.round(byProvider[k].avg / byProvider[k].count * 10) / 10;
    }

    const rated = (feedbacks ?? []).filter(f => f.delta_score !== null);
    const THRESHOLD = 1.0;
    const agree = rated.filter(f =>
      (f.delta_score! > THRESHOLD && f.rating <= 2) ||
      (f.delta_score! <= THRESHOLD && f.rating === 3)
    ).length;
    const fp = rated.filter(f => f.delta_score! > THRESHOLD && f.rating === 3).length;
    const fn = rated.filter(f => f.delta_score! <= THRESHOLD && f.rating <= 2).length;

    return {
      totalEvaluations: total,
      avgScore,
      byProvider,
      feedback: {
        totalRated:       rated.length,
        agreementRate:    rated.length > 0 ? Math.round(agree / rated.length * 100) : null,
        falsePositiveRate: rated.length > 0 ? Math.round(fp    / rated.length * 100) : null,
        falseNegativeRate: rated.length > 0 ? Math.round(fn    / rated.length * 100) : null,
      },
    };
  } catch {
    return null;
  }
}
