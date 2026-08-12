import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const EVENT_NAMES = new Set([
  "beta_landed",
  "beta_run_started",
  "beta_run_completed",
  "beta_run_failed",
  "beta_gate_shown",
  "beta_gate_submitted",
  "beta_history_opened",
]);
const MODES = new Set(["evaluate", "compare", "tournament", "rewrite"]);

function safeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) return undefined;
  return /^[a-zA-Z0-9._:-]+$/.test(value) ? value : undefined;
}

function safeNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return undefined;
  return Math.round(value * 100) / 100;
}

function sanitizeEvent(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const event = safeString(input.event, 40);
  const sessionId = safeString(input.session_id, 80);
  if (!event || !EVENT_NAMES.has(event) || !sessionId) return null;

  const mode = safeString(input.mode, 20);
  const provider = safeString(input.provider, 30);
  const errorType = safeString(input.error_type, 50);
  const sanitized: Record<string, unknown> = {
    event,
    session_id: sessionId,
    schema_version: 1,
    source: "beta_ui",
  };

  if (mode && MODES.has(mode)) sanitized.mode = mode;
  if (provider) sanitized.provider = provider;

  const latency = safeNumber(input.latency_ms, 0, 300_000);
  const trialRemaining = safeNumber(input.trial_remaining, 0, 3);
  const httpStatus = safeNumber(input.http_status, 100, 599);
  const score = safeNumber(input.score, 0, 10);
  if (latency !== undefined) sanitized.latency_ms = latency;
  if (trialRemaining !== undefined) sanitized.trial_remaining = trialRemaining;
  if (httpStatus !== undefined) sanitized.http_status = httpStatus;
  if (score !== undefined) sanitized.score = score;
  if (errorType) sanitized.error_type = errorType;

  return sanitized;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const limited = rateLimit(request, "telemetry", 30);
  if (limited) return limited;

  try {
    const event = sanitizeEvent(await request.json());
    if (!event) {
      console.warn(JSON.stringify({ type: "beta_event_rejected", request_id: requestId, error_type: "invalid_payload" }));
      return NextResponse.json({ error: "Invalid telemetry payload" }, { status: 400 });
    }

    console.info(JSON.stringify({
      type: "beta_event",
      request_id: requestId,
      received_at: new Date().toISOString(),
      ...event,
    }));
    return NextResponse.json({ accepted: true, request_id: requestId }, { status: 202 });
  } catch {
    console.warn(JSON.stringify({ type: "beta_event_rejected", request_id: requestId, error_type: "invalid_json" }));
    return NextResponse.json({ error: "Invalid telemetry payload" }, { status: 400 });
  }
}
