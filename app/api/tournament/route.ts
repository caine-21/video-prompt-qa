import { NextRequest, NextResponse } from "next/server";
import { tournament } from "@/lib/evaluator";
import type { TournamentRequest, AIProvider } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body: TournamentRequest = await req.json();

    if (!Array.isArray(body.prompts) || body.prompts.length < 2) {
      return NextResponse.json({ error: "At least 2 prompts are required" }, { status: 400 });
    }
    if (body.prompts.length > 5) {
      return NextResponse.json({ error: "Maximum 5 prompts allowed" }, { status: 400 });
    }
    const trimmed = body.prompts.map((p) => p.trim()).filter(Boolean);
    if (trimmed.length < 2) {
      return NextResponse.json({ error: "At least 2 non-empty prompts are required" }, { status: 400 });
    }

    const provider: AIProvider = body.provider ?? "groq";
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
