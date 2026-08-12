import { NextResponse } from "next/server";
import { withApiObservability } from "@/lib/observability";

export function GET(request: Request) {
  return withApiObservability(request, {
    route: "/api/health",
    feature: "health",
  }, async () => NextResponse.json({
    status: "ok",
    service: "video-prompt-qa",
    provider: "deepseek",
    model: "deepseek-v4-flash",
    checked_at: new Date().toISOString(),
  }));
}
