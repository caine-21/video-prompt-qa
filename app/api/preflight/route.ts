import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createDefaultPreflightSession } from "@/lib/preflight";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limited = rateLimit(request, "preflight", 4);
    if (limited) return limited;

    const input = await request.json();
    const result = await createDefaultPreflightSession().run(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "INVALID_PREFLIGHT_REQUEST",
        issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message }))
      }, { status: 400 });
    }
    console.error("[PreflightError]", error);
    return NextResponse.json({ error: "PREFLIGHT_FAILED" }, { status: 500 });
  }
}
