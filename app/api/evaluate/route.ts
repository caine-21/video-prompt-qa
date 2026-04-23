import { NextRequest, NextResponse } from "next/server";
import { evaluate } from "@/lib/evaluator";
import type { EvaluateRequest, AIProvider } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body: EvaluateRequest = await req.json();

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const provider: AIProvider = body.provider ?? "gemini";
    const result = await evaluate(body.prompt.trim(), provider);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
