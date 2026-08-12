const EVENT_NAMES = new Set([
  "beta_session_start",
  "preflight_started",
  "preflight_succeeded",
  "preflight_failed",
  "compare_started",
  "compare_completed",
  "compare_failed",
  "tournament_started",
  "tournament_completed",
  "tournament_failed",
  "rewrite_requested",
  "rewrite_copied",
  "rewrite_re_evaluated",
  "rewrite_failed",
  "beta_gate_shown",
  "beta_gate_completed",
  "beta_history_opened",
  "feedback_submitted",
]);

const MODES = new Set(["evaluate", "compare", "tournament", "rewrite"]);
const OPERATIONS = new Set([...MODES, "feedback"]);
const ERROR_TYPES = new Set([
  "network", "timeout", "rate_limit", "auth", "missing_config",
  "insufficient_balance", "invalid_model", "upstream_4xx", "upstream_5xx",
  "invalid_response", "runtime", "provider_failure", "request_failed",
]);

function safeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) return undefined;
  return /^[a-zA-Z0-9._:-]+$/.test(value) ? value : undefined;
}

function safeNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return undefined;
  return Math.round(value * 100) / 100;
}

export function sanitizeEvent(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const event = safeString(input.event, 40);
  const sessionId = safeString(input.session_id, 80);
  if (!event || !EVENT_NAMES.has(event) || !sessionId) return null;

  const mode = safeString(input.mode, 20);
  const operation = safeString(input.operation, 20);
  const provider = safeString(input.provider, 30);
  const requestId = safeString(input.request_id, 80);
  const errorType = safeString(input.error_type, 50);
  const clientVersion = safeString(input.client_version, 30);
  const promptLengthBucket = safeString(input.prompt_length_bucket, 20);
  const scoreBucket = safeString(input.score_bucket, 20);
  const feedback = safeString(input.feedback, 10);
  const sanitized: Record<string, unknown> = {
    event,
    session_id: sessionId,
    schema_version: 1,
    source: "beta_ui",
  };

  if (mode && MODES.has(mode)) sanitized.mode = mode;
  if (operation && OPERATIONS.has(operation)) sanitized.operation = operation;
  if (provider === "deepseek") sanitized.provider = provider;
  if (requestId && /^[0-9a-f-]{36}$/i.test(requestId)) sanitized.request_id = requestId;
  if (clientVersion) sanitized.client_version = clientVersion;
  if (promptLengthBucket && /^(0|1-120|121-500|501-1000|1001-2000|2001-8000)$/.test(promptLengthBucket)) sanitized.prompt_length_bucket = promptLengthBucket;
  if (scoreBucket && /^(0-4|5-6|7-8|9-10)$/.test(scoreBucket)) sanitized.score_bucket = scoreBucket;
  if (feedback === "yes" || feedback === "no") sanitized.feedback = feedback;

  const duration = safeNumber(input.duration_ms, 0, 300_000);
  const trialRemaining = safeNumber(input.trial_remaining, 0, 3);
  const httpStatus = safeNumber(input.http_status, 100, 599);
  if (duration !== undefined) sanitized.duration_ms = duration;
  if (trialRemaining !== undefined) sanitized.trial_remaining = trialRemaining;
  if (httpStatus !== undefined) sanitized.http_status = httpStatus;
  if (errorType && ERROR_TYPES.has(errorType)) sanitized.error_type = errorType;

  return sanitized;
}
