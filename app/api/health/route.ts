import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "video-prompt-qa",
    provider: "groq",
    fallback_provider: "deepseek",
    model: "llama-3.3-70b-versatile",
    checked_at: new Date().toISOString(),
  });
}
