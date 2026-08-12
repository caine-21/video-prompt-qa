import { NextRequest, NextResponse } from "next/server";
import { tournament } from "@/lib/evaluator";
import type { TournamentRequest, AIProvider } from "@/lib/types";
import { maxLength, rateLimit } from "@/lib/rate-limit";
import { withApiObservability } from "@/lib/observability";

async function handlePost(req: NextRequest) {
  try {
    const limited = rateLimit(req, "tournament", 2);
    if (limited) return limited;

    const body: TournamentRequest = await req.json();

    if (!Array.isArray(body.prompts) || body.prompts.length < 2) {
      return NextResponse.json({ error: "At least 2 prompts are required" }, { status: 400 });
    }
    if (body.prompts.length > 5) {
      return NextResponse.json({ error: "Maximum 5 prompts allowed" }, { status: 400 });
    }
    if (body.prompts.some((prompt) => typeof prompt !== "string")) {
      return NextResponse.json({ error: "Each prompt must be a string" }, { status: 400 });
    }
    const trimmed = body.prompts.map((p) => p.trim()).filter(Boolean);
    if (trimmed.length < 2) {
      return NextResponse.json({ error: "At least 2 non-empty prompts are required" }, { status: 400 });
    }
    if (trimmed.some((prompt) => !maxLength(prompt, 8000))) {
      return NextResponse.json({ error: "Each prompt must be 8000 characters or fewer" }, { status: 400 });
    }

    const provider: AIProvider = "deepseek";
    const result = await tournament(trimmed, provider);

    if (!result.success) {
      return NextResponse.json({ error: result.error.message, errorType: result.error.type }, { status: 503 });
    }
    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export function POST(req: NextRequest) {
  return withApiObservability(req, {
    route: "/api/tournament",
    feature: "tournament",
    provider: "deepseek",
    model: "deepseek-v4-flash",
  }, () => handlePost(req));
}
