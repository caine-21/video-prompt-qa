import { NextRequest, NextResponse } from "next/server";
import { evaluate } from "@/lib/evaluator";
import { logEvaluation } from "@/lib/db";
import type { EvaluateRequest, AIProvider } from "@/lib/types";
import { maxLength, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, "evaluate", 10);
    if (limited) return limited;

    const body: EvaluateRequest = await req.json();

    if (typeof body.prompt !== "string" || !body.prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (!maxLength(body.prompt, 8000)) {
      return NextResponse.json({ error: "Prompt must be 8000 characters or fewer" }, { status: 400 });
    }

    const provider: AIProvider = body.provider ?? "deepseek";
    const result = await evaluate(body.prompt.trim(), provider);

    if (!result.success) {
      const fallback = result.provider !== provider;
      return NextResponse.json({
        error: result.error.message,
        errorType: result.error.type,
        requested_provider: provider,
        actual_provider: result.provider,
        fallback,
        ...(fallback ? { fallback_reason_code: result.fallbackReasonCode ?? result.error.type } : {}),
      }, { status: 503 });
    }

    const dbId = await logEvaluation(result.data);
    const fallback = result.provider !== provider;
    const diagnostic = {
      requested_provider: provider,
      actual_provider: result.provider,
      fallback,
      ...(fallback ? { fallback_reason_code: result.fallbackReasonCode ?? "unknown" } : {}),
    };
    const response = dbId ? { ...result.data, dbId, ...diagnostic } : { ...result.data, ...diagnostic };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
