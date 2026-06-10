import { NextRequest, NextResponse } from "next/server";
import { rewrite } from "@/lib/evaluator";
import type { RewriteRequest, AIProvider } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body: RewriteRequest = await req.json();

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (!body.dimensions?.length || !body.improvements?.length) {
      return NextResponse.json({ error: "Evaluation context is required" }, { status: 400 });
    }

    const provider: AIProvider = body.provider ?? "groq";
    const result = await rewrite(body.prompt.trim(), body.dimensions, body.improvements, provider);

    if (!result.success) {
      return NextResponse.json({ error: result.error.message, errorType: result.error.type }, { status: 503 });
    }
    return NextResponse.json({ improvedPrompt: result.data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
