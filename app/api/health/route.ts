import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "video-prompt-qa",
    provider: "deepseek",
    model: "deepseek-v4-flash",
    checked_at: new Date().toISOString(),
  });
}
