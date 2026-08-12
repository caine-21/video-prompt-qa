import { NextResponse } from "next/server";
import { getStats } from "@/lib/db";
import { withApiObservability } from "@/lib/observability";

async function handleGet() {
  const stats = await getStats();
  if (!stats) {
    return NextResponse.json(
      { error: "Stats unavailable — database not configured" },
      { status: 503 }
    );
  }
  return NextResponse.json(stats);
}

export function GET(request: Request) {
  return withApiObservability(request, {
    route: "/api/stats",
    feature: "stats",
  }, handleGet);
}
