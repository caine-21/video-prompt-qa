import { NextRequest, NextResponse } from "next/server";
import { logFeedback } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { evaluationId, rating, tags, deltaScore } = await req.json();
    if (!evaluationId || !rating) {
      return NextResponse.json({ error: "evaluationId and rating are required" }, { status: 400 });
    }
    await logFeedback(evaluationId, rating, tags ?? [], deltaScore);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
