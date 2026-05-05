import { NextResponse } from "next/server";
import { getStats } from "@/lib/db";

export async function GET() {
  const stats = await getStats();
  if (!stats) {
    return NextResponse.json(
      { error: "Stats unavailable — database not configured" },
      { status: 503 }
    );
  }
  return NextResponse.json(stats);
}
