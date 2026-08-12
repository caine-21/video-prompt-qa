export type BetaMode = "evaluate" | "compare" | "tournament" | "rewrite";

export type BetaEventName =
  | "beta_session_start"
  | "preflight_started"
  | "preflight_succeeded"
  | "preflight_failed"
  | "compare_started"
  | "compare_completed"
  | "compare_failed"
  | "tournament_started"
  | "tournament_completed"
  | "tournament_failed"
  | "rewrite_requested"
  | "rewrite_copied"
  | "rewrite_re_evaluated"
  | "rewrite_failed"
  | "beta_gate_shown"
  | "beta_gate_completed"
  | "beta_history_opened"
  | "feedback_submitted";

export interface BetaEventProperties {
  mode?: BetaMode;
  operation?: BetaMode | "feedback";
  provider?: string;
  request_id?: string;
  duration_ms?: number;
  trial_remaining?: number;
  http_status?: number;
  error_type?: string;
  score_bucket?: "0-4" | "5-6" | "7-8" | "9-10";
  prompt_length_bucket?: "0" | "1-120" | "121-500" | "501-1000" | "1001-2000" | "2001-8000";
  feedback?: "yes" | "no";
}

const SESSION_KEY = "vpqa_beta_session_v1";
const CLIENT_VERSION = "web-v1.4";

function getSessionId(): string {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (stored) return stored;

    const generated = typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(SESSION_KEY, generated);
    return generated;
  } catch {
    return "anonymous";
  }
}

export function trackBetaEvent(event: BetaEventName, properties: BetaEventProperties = {}): void {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    event,
    session_id: getSessionId(),
    client_version: CLIENT_VERSION,
    client_timestamp: new Date().toISOString(),
    ...properties,
  });

  try {
    const body = new Blob([payload], { type: "application/json" });
    if (typeof navigator.sendBeacon === "function") {
      const sent = navigator.sendBeacon("/api/telemetry", body);
      if (sent) return;
    }
  } catch { /* fall through to keepalive fetch */ }

  void fetch("/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => { /* telemetry must never affect the product path */ });
}
