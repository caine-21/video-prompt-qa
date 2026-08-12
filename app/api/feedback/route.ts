import { NextRequest, NextResponse } from "next/server";
import { logFeedback } from "@/lib/db";
import { withApiObservability } from "@/lib/observability";

async function handlePost(req: NextRequest) {
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

export function POST(req: NextRequest) {
  return withApiObservability(req, {
    route: "/api/feedback",
    feature: "feedback",
  }, () => handlePost(req));
}
