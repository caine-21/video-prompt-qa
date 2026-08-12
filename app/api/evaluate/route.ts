import { NextRequest, NextResponse } from "next/server";
import { evaluate } from "@/lib/evaluator";
import { logEvaluation } from "@/lib/db";
import type { EvaluateRequest, AIProvider } from "@/lib/types";
import { maxLength, rateLimit } from "@/lib/rate-limit";
import { withApiObservability } from "@/lib/observability";

async function handlePost(req: NextRequest) {
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

    const provider: AIProvider = "deepseek";
    const result = await evaluate(body.prompt.trim(), provider);

    if (!result.success) {
      return NextResponse.json({
        error: result.error.message,
        errorType: result.error.type,
        provider: result.provider,
      }, { status: 503 });
    }

    const dbId = await logEvaluation(result.data);
    const response = dbId ? { ...result.data, dbId } : result.data;
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export function POST(req: NextRequest) {
  return withApiObservability(req, {
    route: "/api/evaluate",
    feature: "evaluate",
    provider: "deepseek",
    model: "deepseek-v4-flash",
  }, () => handlePost(req));
}
