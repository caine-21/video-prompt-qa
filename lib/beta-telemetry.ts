export type BetaMode = "evaluate" | "compare" | "tournament" | "rewrite";

export type BetaEventName =
  | "beta_landed"
  | "beta_run_started"
  | "beta_run_completed"
  | "beta_run_failed"
  | "beta_gate_shown"
  | "beta_gate_submitted"
  | "beta_history_opened";

export interface BetaEventProperties {
  mode?: BetaMode;
  provider?: string;
  latency_ms?: number;
  trial_remaining?: number;
  http_status?: number;
  error_type?: string;
  score?: number;
}

const SESSION_KEY = "vpqa_beta_session_v1";

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
