export type ApiFeature =
  | "evaluate"
  | "compare"
  | "rewrite"
  | "tournament"
  | "batch"
  | "preflight"
  | "feedback"
  | "stats"
  | "health"
  | "beta_telemetry";

export interface ApiObservabilityMeta {
  route: string;
  feature: ApiFeature;
  provider?: "deepseek";
  model?: "deepseek-v4-flash";
}

export interface ApiRequestLog {
  type: "api_request";
  request_id: string;
  timestamp: string;
  method: string;
  route: string;
  feature: ApiFeature;
  status: number;
  status_class: string;
  outcome: "success" | "rate_limited" | "rejected" | "error" | "other";
  latency_ms: number;
  provider?: "deepseek";
  model?: "deepseek-v4-flash";
}

export function statusClass(status: number): string {
  return `${Math.floor(status / 100)}xx`;
}

export function requestOutcome(status: number): ApiRequestLog["outcome"] {
  if (status >= 200 && status < 300) return "success";
  if (status === 429) return "rate_limited";
  if (status >= 400 && status < 500) return "rejected";
  if (status >= 500 && status < 600) return "error";
  return "other";
}

function emitApiRequest(log: ApiRequestLog): void {
  console.info(JSON.stringify(log));
}

/**
 * Wrap a route without reading request or response bodies. This keeps prompts,
 * model output, credentials, and user identifiers out of request logs while
 * still making public-beta behavior observable in platform logs.
 */
export async function withApiObservability(
  request: Request,
  meta: ApiObservabilityMeta,
  handler: () => Promise<Response>,
): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const response = await handler();
    const log: ApiRequestLog = {
      type: "api_request",
      request_id: requestId,
      timestamp: new Date().toISOString(),
      method: request.method,
      route: meta.route,
      feature: meta.feature,
      status: response.status,
      status_class: statusClass(response.status),
      outcome: requestOutcome(response.status),
      latency_ms: Date.now() - startedAt,
      ...(meta.provider ? { provider: meta.provider } : {}),
      ...(meta.model ? { model: meta.model } : {}),
    };
    emitApiRequest(log);

    const headers = new Headers(response.headers);
    headers.set("X-Request-ID", requestId);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    emitApiRequest({
      type: "api_request",
      request_id: requestId,
      timestamp: new Date().toISOString(),
      method: request.method,
      route: meta.route,
      feature: meta.feature,
      status: 500,
      status_class: "5xx",
      outcome: "error",
      latency_ms: Date.now() - startedAt,
      ...(meta.provider ? { provider: meta.provider } : {}),
      ...(meta.model ? { model: meta.model } : {}),
    });
    throw error;
  }
}
