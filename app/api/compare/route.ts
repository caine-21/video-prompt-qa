import { NextRequest, NextResponse } from "next/server";
import { compare } from "@/lib/evaluator";
import type { CompareRequest, AIProvider } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body: CompareRequest = await req.json();

    if (!body.promptA?.trim() || !body.promptB?.trim()) {
      return NextResponse.json(
        { error: "Both prompts are required" },
        { status: 400 }
      );
    }

    const provider: AIProvider = body.provider ?? "gemini";
    const result = await compare(body.promptA.trim(), body.promptB.trim(), provider);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
