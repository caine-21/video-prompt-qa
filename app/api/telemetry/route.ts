import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { withApiObservability } from "@/lib/observability";
import { sanitizeEvent } from "@/lib/beta-telemetry-contract";

async function handlePost(request: Request) {
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

export function POST(request: Request) {
  return withApiObservability(request, {
    route: "/api/telemetry",
    feature: "beta_telemetry",
  }, () => handlePost(request));
}
