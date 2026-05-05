import { NextRequest, NextResponse } from "next/server";
import { evaluate } from "@/lib/evaluator";
import { logEvaluation } from "@/lib/db";
import type { AIProvider } from "@/lib/types";

const MAX_BATCH = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompts: string[] = body.prompts;
    const provider: AIProvider = body.provider ?? "groq";

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ error: "prompts must be a non-empty array" }, { status: 400 });
    }
    if (prompts.length > MAX_BATCH) {
      return NextResponse.json({ error: `Max batch size is ${MAX_BATCH}` }, { status: 400 });
    }

    const results = await Promise.all(
      prompts.map(async (prompt) => {
        const trimmed = prompt.trim();
        if (!trimmed) return { prompt, error: "empty prompt" };
        try {
          const result = await evaluate(trimmed, provider);
          await logEvaluation(result);
          return result;
        } catch (e) {
          return { prompt: trimmed, error: e instanceof Error ? e.message : "evaluation failed" };
        }
      })
    );

    const valid = results.filter(r => "overallScore" in r);
    const summary = valid.length > 0
      ? {
          count:    valid.length,
          avgScore: Math.round(valid.reduce((s, r) => s + (r as { overallScore: number }).overallScore, 0) / valid.length * 10) / 10,
          minScore: Math.min(...valid.map(r => (r as { overallScore: number }).overallScore)),
          maxScore: Math.max(...valid.map(r => (r as { overallScore: number }).overallScore)),
        }
      : null;

    return NextResponse.json({ results, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
