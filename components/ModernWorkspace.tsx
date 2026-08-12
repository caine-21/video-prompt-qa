"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { EvaluationResult, CompareResult, TournamentResult, AIProvider, HistoryEntry, HumanFeedback } from "@/lib/types";
import { trackBetaEvent, type BetaEventName, type BetaMode } from "@/lib/beta-telemetry";
import { useLanguage } from "@/lib/lang-context";
import { readShareFromURL } from "@/lib/share";
import EvaluatePanel from "@/components/EvaluatePanel";
import ComparePanel from "@/components/ComparePanel";
import TournamentPanel from "@/components/TournamentPanel";
import EvaluationReport from "@/components/EvaluationReport";
import CompareReport from "@/components/CompareReport";
import TournamentReport from "@/components/TournamentReport";
import DeltaBanner from "@/components/DeltaBanner";
import FeedbackWidget from "@/components/BetaFeedback";
import PromptDiff from "@/components/PromptDiff";
import StabilityCheck from "@/components/StabilityCheck";
import ShareButton from "@/components/ShareButton";
import DemoModeBanner from "@/components/DemoModeBanner";
import HistoryPanel from "@/components/HistoryPanel";
import CalibrationPanel from "@/components/CalibrationPanel";

type Tab = "evaluate" | "compare" | "tournament";

type WorkspaceError = {
  title: string;
  message: string;
  requestId?: string;
  retryable: boolean;
};

const HISTORY_KEY = "vpqa_history";
const FREE_TRIAL_KEY = "vpqa_free_runs_v1";
const ACCOUNT_KEY = "vpqa_beta_account_v1";
const MAX_HISTORY = 20;
const FREE_TRIAL_LIMIT = 3;

function promptLengthBucket(length: number): "0" | "1-120" | "121-500" | "501-1000" | "1001-2000" | "2001-8000" {
  if (length === 0) return "0";
  if (length <= 120) return "1-120";
  if (length <= 500) return "121-500";
  if (length <= 1000) return "501-1000";
  if (length <= 2000) return "1001-2000";
  return "2001-8000";
}

function scoreBucket(score: number | undefined): "0-4" | "5-6" | "7-8" | "9-10" | undefined {
  if (score === undefined || !Number.isFinite(score)) return undefined;
  if (score < 5) return "0-4";
  if (score < 7) return "5-6";
  if (score < 9) return "7-8";
  return "9-10";
}

function responseRequestId(response: Response): string | undefined {
  const value = response.headers.get("X-Request-ID") ?? undefined;
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : undefined;
}

async function responseBody<T = unknown>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => ({}));
  return body && typeof body === "object" ? body as T : {} as T;
}

function isWorkspaceError(value: unknown): value is WorkspaceError {
  return Boolean(value && typeof value === "object" && "title" in value && "message" in value && "retryable" in value);
}

function userFacingError(status: number, body: Record<string, unknown>, requestId?: string): WorkspaceError {
  if (status === 429) return { title: "Rate limit reached.", message: "Please wait a moment and try again.", requestId, retryable: true };
  if (status === 400) return { title: "Check the prompt.", message: typeof body.error === "string" ? body.error : "The input could not be evaluated.", requestId, retryable: false };
  if (body.errorType === "timeout") return { title: "Evaluation took longer than expected.", message: "Try again with the same prompt in a moment.", requestId, retryable: true };
  if (status >= 500) return { title: "The evaluator could not complete this run.", message: "No result was saved. You can try again.", requestId, retryable: true };
  return { title: "The request could not be completed.", message: "Please check the input and try again.", requestId, retryable: true };
}

function betaStartEvent(mode: BetaMode): BetaEventName {
  if (mode === "evaluate") return "preflight_started" as const;
  if (mode === "compare") return "compare_started" as const;
  if (mode === "tournament") return "tournament_started" as const;
  return "rewrite_requested" as const;
}

function betaSuccessEvent(mode: BetaMode): BetaEventName {
  if (mode === "evaluate") return "preflight_succeeded" as const;
  if (mode === "compare") return "compare_completed" as const;
  if (mode === "tournament") return "tournament_completed" as const;
  return "rewrite_re_evaluated" as const;
}

function betaFailureEvent(mode: BetaMode): BetaEventName {
  if (mode === "evaluate") return "preflight_failed" as const;
  if (mode === "compare") return "compare_failed" as const;
  if (mode === "tournament") return "tournament_failed" as const;
  return "rewrite_failed" as const;
}

export default function ModernWorkspace() {
  const { lang, toggleLang } = useLanguage();
  const [tab, setTab] = useState<Tab>("evaluate");
  const [provider, setProvider] = useState<AIProvider>("deepseek");
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [tournamentResult, setTournamentResult] = useState<TournamentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [error, setError] = useState<WorkspaceError | null>(null);
  const [delta, setDelta] = useState<{ originalResult: EvaluationResult } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingFeedbackId, setPendingFeedbackId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoTitle, setDemoTitle] = useState("");
  const [freeUses, setFreeUses] = useState(0);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountEmailInput, setAccountEmailInput] = useState("");
  const [showAccountGate, setShowAccountGate] = useState(false);
  const retryAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const storedHistory = localStorage.getItem(HISTORY_KEY);
        if (storedHistory) setHistory(JSON.parse(storedHistory));
        const storedUses = Number(localStorage.getItem(FREE_TRIAL_KEY) ?? "0");
        const initialUses = Number.isFinite(storedUses) ? Math.min(FREE_TRIAL_LIMIT, Math.max(0, storedUses)) : 0;
        setFreeUses(initialUses);
        const storedAccount = localStorage.getItem(ACCOUNT_KEY);
        if (storedAccount) setAccountEmail(storedAccount);
        trackBetaEvent("beta_session_start", { operation: "evaluate", trial_remaining: FREE_TRIAL_LIMIT - initialUses });
      } catch { /* ignore local browser storage failures */ }

      const shared = readShareFromURL();
      if (!shared) return;
      setProvider(shared.provider);
      setEvalResult(shared.improvedResult ?? shared.result);
      if (shared.improvedResult) setDelta({ originalResult: shared.result });
      if (shared.demoMode) {
        setDemoMode(true);
        setDemoTitle(shared.demoTitle ?? "Evaluation Pipeline Demo");
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const remainingFreeRuns = Math.max(0, FREE_TRIAL_LIMIT - freeUses);
  const hasAccount = Boolean(accountEmail);

  function saveToHistory(result: EvaluationResult, deltaScore?: number): string {
    const entry: HistoryEntry = { id: `${Date.now()}-${Math.random()}`, result, deltaScore };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    return entry.id;
  }

  function consumeFreeRun() {
    if (hasAccount) return;
    setFreeUses(prev => {
      const next = Math.min(FREE_TRIAL_LIMIT, prev + 1);
      try { localStorage.setItem(FREE_TRIAL_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function ensureRunAccess() {
    if (hasAccount || freeUses < FREE_TRIAL_LIMIT) return true;
    trackBetaEvent("beta_gate_shown", { trial_remaining: 0 });
    setShowAccountGate(true);
    return false;
  }

  function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = accountEmailInput.trim().toLowerCase();
    if (!email) return;
    setAccountEmail(email);
    setAccountEmailInput("");
    setShowAccountGate(false);
    trackBetaEvent("beta_gate_completed", { trial_remaining: remainingFreeRuns });
    try { localStorage.setItem(ACCOUNT_KEY, email); } catch { /* ignore */ }
  }

  function startBetaRun(mode: BetaMode, promptLength: number): number {
    trackBetaEvent(betaStartEvent(mode), { mode, operation: mode, provider, trial_remaining: remainingFreeRuns, prompt_length_bucket: promptLengthBucket(promptLength) });
    return Date.now();
  }

  function completeBetaRun(mode: BetaMode, startedAt: number, data: { provider?: string; overallScore?: number; requestId?: string; promptLength: number }) {
    trackBetaEvent(betaSuccessEvent(mode), {
      mode,
      operation: mode,
      provider: data.provider ?? provider,
      duration_ms: Date.now() - startedAt,
      request_id: data.requestId,
      prompt_length_bucket: promptLengthBucket(data.promptLength),
      trial_remaining: Math.max(0, remainingFreeRuns - 1),
      score_bucket: scoreBucket(data.overallScore),
      http_status: 200,
    });
  }

  function failBetaRun(mode: BetaMode, startedAt: number, status: number, promptLength: number, errorType?: string, requestId?: string) {
    const safeErrorType = errorType && /^[a-zA-Z0-9_:-]{1,50}$/.test(errorType) ? errorType : undefined;
    trackBetaEvent(betaFailureEvent(mode), {
      mode,
      operation: mode,
      provider,
      duration_ms: Date.now() - startedAt,
      request_id: requestId,
      prompt_length_bucket: promptLengthBucket(promptLength),
      trial_remaining: remainingFreeRuns,
      http_status: status,
      error_type: safeErrorType ?? (status === 429 ? "rate_limit" : status >= 500 ? "provider_failure" : "request_failed"),
    });
  }

  function handleFeedback(feedback: HumanFeedback) {
    if (!pendingFeedbackId) return;
    trackBetaEvent("feedback_submitted", { operation: "feedback", feedback: feedback.rating === 1 ? "yes" : "no" });
    setHistory(prev => {
      const next = prev.map(e => e.id === pendingFeedbackId ? { ...e, feedback } : e);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setPendingFeedbackId(null);
  }

  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  }

  function exportJSON(result: EvaluationResult) {
    const payload = { version: "v0.3-calibrated", schema: "EvaluationResult", exportedAt: new Date().toISOString(), ...result };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `vpqa-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleEvaluate(prompt: string) {
    if (!ensureRunAccess()) return;
    retryAction.current = () => { void handleEvaluate(prompt); };
    const startedAt = startBetaRun("evaluate", prompt.length);
    let failureTracked = false;
    setLoading(true); setError(null); setEvalResult(null); setDelta(null); setPendingFeedbackId(null);
    try {
      const res = await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, provider }) });
      const requestId = responseRequestId(res);
      const data = await responseBody<EvaluationResult>(res);
      if (!res.ok) { const errorBody = data as unknown as Record<string, unknown>; failureTracked = true; failBetaRun("evaluate", startedAt, res.status, prompt.length, String(errorBody.errorType ?? "request_failed"), requestId); throw userFacingError(res.status, errorBody, requestId); }
      setEvalResult(data); setPendingFeedbackId(saveToHistory(data)); consumeFreeRun();
      retryAction.current = null;
      completeBetaRun("evaluate", startedAt, { provider: String(data.provider ?? provider), overallScore: typeof data.overallScore === "number" ? data.overallScore : undefined, requestId, promptLength: prompt.length });
    } catch (e) { if (!failureTracked) failBetaRun("evaluate", startedAt, 0, prompt.length, "network"); setError(isWorkspaceError(e) ? e : { title: "Could not reach the evaluator.", message: "Check your connection and try again.", retryable: true }); }
    finally { setLoading(false); }
  }

  async function handleCompare(promptA: string, promptB: string) {
    if (!ensureRunAccess()) return;
    retryAction.current = () => { void handleCompare(promptA, promptB); };
    const startedAt = startBetaRun("compare", promptA.length + promptB.length);
    let failureTracked = false;
    setLoading(true); setError(null); setCompareResult(null);
    try {
      const res = await fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ promptA, promptB, provider }) });
      const requestId = responseRequestId(res);
      const data = await responseBody<CompareResult>(res);
      if (!res.ok) { const errorBody = data as unknown as Record<string, unknown>; failureTracked = true; failBetaRun("compare", startedAt, res.status, promptA.length + promptB.length, String(errorBody.errorType ?? "request_failed"), requestId); throw userFacingError(res.status, errorBody, requestId); }
      setCompareResult(data); consumeFreeRun();
      retryAction.current = null;
      completeBetaRun("compare", startedAt, { provider: String(data.provider ?? provider), requestId, promptLength: promptA.length + promptB.length });
    } catch (e) { if (!failureTracked) failBetaRun("compare", startedAt, 0, promptA.length + promptB.length, "network"); setError(isWorkspaceError(e) ? e : { title: "Could not reach the evaluator.", message: "Check your connection and try again.", retryable: true }); }
    finally { setLoading(false); }
  }

  async function handleTournament(prompts: string[]) {
    if (!ensureRunAccess()) return;
    retryAction.current = () => { void handleTournament(prompts); };
    const startedAt = startBetaRun("tournament", prompts.reduce((total, prompt) => total + prompt.length, 0));
    let failureTracked = false;
    setLoading(true); setError(null); setTournamentResult(null);
    try {
      const res = await fetch("/api/tournament", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompts, provider }) });
      const requestId = responseRequestId(res);
      const data = await responseBody<TournamentResult>(res);
      if (!res.ok) { const errorBody = data as unknown as Record<string, unknown>; failureTracked = true; failBetaRun("tournament", startedAt, res.status, prompts.reduce((total, prompt) => total + prompt.length, 0), String(errorBody.errorType ?? "request_failed"), requestId); throw userFacingError(res.status, errorBody, requestId); }
      setTournamentResult(data); consumeFreeRun();
      retryAction.current = null;
      const championScore = Array.isArray(data.rankings) && typeof data.rankings[0]?.avgScore === "number" ? data.rankings[0].avgScore : undefined;
      completeBetaRun("tournament", startedAt, { provider: String(data.provider ?? provider), overallScore: championScore, requestId, promptLength: prompts.reduce((total, prompt) => total + prompt.length, 0) });
    } catch (e) { if (!failureTracked) failBetaRun("tournament", startedAt, 0, prompts.reduce((total, prompt) => total + prompt.length, 0), "network"); setError(isWorkspaceError(e) ? e : { title: "Could not reach the evaluator.", message: "Check your connection and try again.", retryable: true }); }
    finally { setLoading(false); }
  }

  async function handleImprove(result: EvaluationResult) {
    if (!ensureRunAccess()) return;
    retryAction.current = () => { void handleImprove(result); };
    const startedAt = startBetaRun("rewrite", result.prompt.length);
    let failureTracked = false;
    setImproving(true); setError(null);
    try {
      const rr = await fetch("/api/rewrite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: result.prompt, dimensions: result.dimensions, improvements: result.improvements, provider }) });
      const rewriteRequestId = responseRequestId(rr);
      const rd = await responseBody<{ improvedPrompt?: string }>(rr);
      if (!rr.ok) { const errorBody = rd as unknown as Record<string, unknown>; failureTracked = true; failBetaRun("rewrite", startedAt, rr.status, result.prompt.length, String(errorBody.errorType ?? "request_failed"), rewriteRequestId); throw userFacingError(rr.status, errorBody, rewriteRequestId); }
      const er = await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: rd.improvedPrompt, provider }) });
      const evaluateRequestId = responseRequestId(er);
      const newResult = await responseBody<EvaluationResult>(er);
      if (!er.ok) { const errorBody = newResult as unknown as Record<string, unknown>; failureTracked = true; failBetaRun("rewrite", startedAt, er.status, String(rd.improvedPrompt ?? "").length, String(errorBody.errorType ?? "request_failed"), evaluateRequestId); throw userFacingError(er.status, errorBody, evaluateRequestId); }
      const deltaScore = Math.round((newResult.overallScore - result.overallScore) * 10) / 10;
      setDelta({ originalResult: result }); setEvalResult(newResult); setPendingFeedbackId(saveToHistory(newResult, deltaScore)); consumeFreeRun();
      retryAction.current = null;
      completeBetaRun("rewrite", startedAt, { provider: String(newResult.provider ?? provider), overallScore: typeof newResult.overallScore === "number" ? newResult.overallScore : undefined, requestId: evaluateRequestId, promptLength: String(newResult.prompt ?? "").length });
    } catch (e) { if (!failureTracked) failBetaRun("rewrite", startedAt, 0, result.prompt.length, "network"); setError(isWorkspaceError(e) ? e : { title: "The rewrite could not be completed.", message: "No new result was saved. You can try again.", retryable: true }); }
    finally { setImproving(false); }
  }

  function selectTab(nextTab: Tab) {
    setTab(nextTab); setError(null); setDelta(null); setTournamentResult(null); setCompareResult(null);
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-topbar">
        <a className="brand-lockup" href="#top" aria-label="VideoPromptQA home">
          <div className="brand-mark" aria-hidden="true">VQ</div>
          <div><div className="brand-name">VideoPrompt<span>QA</span></div><div className="brand-subtitle">Preflight checks for video generation</div></div>
        </a>
        <div className="topbar-actions">
          <div className="usage-pill" aria-label={hasAccount ? "Beta access active" : `${remainingFreeRuns} free runs remaining`}><span className="status-dot" />{hasAccount ? "Beta access" : `${remainingFreeRuns} runs left`}</div>
          <button className="topbar-button" onClick={toggleLang} type="button" aria-label="Toggle language">{lang === "en" ? "中文" : "EN"}</button>
          {hasAccount ? (
            <button className="account-chip" type="button" onClick={() => setShowAccountGate(true)} title={accountEmail ? "Beta access stored locally" : "Beta access"}><span className="account-avatar">{accountEmail?.slice(0, 1).toUpperCase()}</span>Beta access</button>
          ) : <button className="topbar-button topbar-button-primary" type="button" onClick={() => setShowAccountGate(true)}>Join beta</button>}
        </div>
      </header>

      <div className="workspace-layout">
        <aside className="workspace-sidebar">
          <div><div className="sidebar-label">Workspace</div><nav className="sidebar-nav" aria-label="Workspace navigation">
            <button className={`sidebar-nav-item ${tab === "evaluate" ? "is-active" : ""}`} onClick={() => selectTab("evaluate")} type="button"><span className="nav-icon">01</span> Preflight</button>
            <button className={`sidebar-nav-item ${showHistory ? "is-active" : ""}`} onClick={() => setShowHistory(value => !value)} type="button"><span className="nav-icon">02</span> History{history.length > 0 && <span className="nav-count">{history.length}</span>}</button>
            <button className={`sidebar-nav-item ${tab === "compare" ? "is-active" : ""}`} onClick={() => selectTab("compare")} type="button"><span className="nav-icon">03</span> Compare</button>
            <button className={`sidebar-nav-item ${tab === "tournament" ? "is-active" : ""}`} onClick={() => selectTab("tournament")} type="button"><span className="nav-icon">04</span> Tournament</button>
          </nav></div>
          <div className="sidebar-footer"><div className="engine-card"><div className="sidebar-label">Checks included</div><div className="engine-row"><span className="engine-status" /><strong>5 dimensions</strong></div><div className="engine-caption">Clarity, motion, consistency and risk</div></div><a className="github-link" href="https://github.com/caine-21/video-prompt-qa" target="_blank" rel="noopener noreferrer">View source <span aria-hidden="true">↗</span></a></div>
        </aside>

        <main className="workspace-main">
          {demoMode && <DemoModeBanner title={demoTitle} onDismiss={() => setDemoMode(false)} />}
          <section id="top" className="workspace-intro"><div className="intro-kicker"><span className="kicker-line" /> Video generation · preflight</div><h1>Check your video prompt before you generate.</h1><p>Review clarity, motion, consistency and generation risk before spending a render.</p></section>

          <div className="workspace-toolbar"><div className="tool-tabs" role="tablist" aria-label="Evaluation mode">
            {(["evaluate", "compare", "tournament"] as Tab[]).map(tabKey => <button key={tabKey} className={`tool-tab ${tab === tabKey ? "is-active" : ""}`} onClick={() => selectTab(tabKey)} type="button" role="tab" aria-selected={tab === tabKey}>{tabKey === "evaluate" ? "Single prompt" : tabKey === "compare" ? "A / B compare" : "Tournament"}</button>)}
          </div><div className="provider-control"><span>Evaluation mode</span><span className="provider-note">Structured preflight</span></div></div>

          {!hasAccount && <div className={`trial-banner ${remainingFreeRuns === 0 ? "is-exhausted" : ""}`}><div><strong>{remainingFreeRuns === 0 ? "Free preview complete" : `${remainingFreeRuns} free run${remainingFreeRuns === 1 ? "" : "s"} remaining`}</strong><span>{remainingFreeRuns === 0 ? "Enter an email to continue this beta on the same device." : "No payment required. Runs are saved locally in this browser."}</span></div><button type="button" onClick={() => remainingFreeRuns === 0 ? setShowAccountGate(true) : undefined} disabled={remainingFreeRuns > 0}>{remainingFreeRuns === 0 ? "Continue" : "Beta preview"}</button></div>}

          {showHistory && <div className="workspace-history"><div className="history-heading"><div><div className="section-kicker">Recent evaluations</div><p>Stored on this device.</p></div></div><HistoryPanel entries={history} onSelect={result => { setEvalResult(result); setDelta(null); setPendingFeedbackId(null); setShowHistory(false); setTab("evaluate"); }} onClear={clearHistory} /><CalibrationPanel entries={history} /></div>}

          <section className="composer-frame"><div className="composer-frame-header"><div><div className="section-kicker">Prompt input</div><h2>{tab === "evaluate" ? "Preflight a video prompt" : tab === "compare" ? "Compare two directions" : "Rank multiple directions"}</h2></div><span className="structured-pill"><span className="status-dot" /> Five checks</span></div><div className="composer-content">
            {tab === "evaluate" && <EvaluatePanel onSubmit={handleEvaluate} loading={loading} />}
            {tab === "compare" && <ComparePanel onSubmit={handleCompare} loading={loading} />}
            {tab === "tournament" && <TournamentPanel onSubmit={handleTournament} loading={loading} />}
          </div></section>

          {error && <div className="notice notice-error" role="alert"><span><strong>{error.title}</strong> {error.message}{error.requestId && <small className="request-id">Request ID: {error.requestId}</small>}</span><div className="notice-actions">{error.retryable && <button className="text-action" onClick={() => retryAction.current?.()} type="button">Try again</button>}<button className="text-action" onClick={() => setError(null)} type="button">Dismiss</button></div></div>}
          {(loading || improving) && <div className="loading-state" role="status"><div className="loading-line" /><div><strong>{improving ? "Preparing suggested rewrite" : "Running preflight"}</strong><span>Checking the prompt and assembling findings.</span></div></div>}

          {delta && evalResult && tab === "evaluate" && <><DeltaBanner originalPrompt={delta.originalResult.prompt} originalScore={delta.originalResult.overallScore} newScore={evalResult.overallScore} /><PromptDiff originalPrompt={delta.originalResult.prompt} newPrompt={evalResult.prompt} originalAnatomy={delta.originalResult.anatomy} newAnatomy={evalResult.anatomy} onCopy={() => trackBetaEvent("rewrite_copied", { mode: "rewrite", operation: "rewrite" })} /></>}

          {evalResult && tab === "evaluate" && <section className="results-frame"><div className="results-frame-header"><div><div className="section-kicker">Evaluation</div><h2>Findings before generation</h2></div><div className="result-actions"><ShareButton provider={provider} result={delta ? delta.originalResult : evalResult} improvedResult={delta ? evalResult : undefined} demoMode demoTitle={delta ? `Suggested rewrite · ${delta.originalResult.overallScore} → ${evalResult.overallScore}` : `Preflight · ${evalResult.overallScore}/10`} /><button className="secondary-action" onClick={() => exportJSON(evalResult)} type="button">Export JSON</button></div></div><EvaluationReport result={evalResult} onImprove={handleImprove} improving={improving} /><StabilityCheck prompt={evalResult.prompt} currentProvider={provider} currentResult={evalResult} defaultOpen={demoMode} />{pendingFeedbackId && <FeedbackWidget onSubmit={handleFeedback} />}</section>}
          {compareResult && tab === "compare" && <CompareReport result={compareResult} />}
          {tournamentResult && tab === "tournament" && <TournamentReport result={tournamentResult} />}
          <footer className="workspace-footer"><span>VideoPromptQA · preflight checks for video generation prompts.</span><a href="https://github.com/caine-21/video-prompt-qa" target="_blank" rel="noopener noreferrer">GitHub ↗</a><span className="footer-engine">Evaluation powered by DeepSeek.</span></footer>
        </main>
      </div>

      {showAccountGate && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setShowAccountGate(false); }}><section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title"><button className="modal-close" type="button" onClick={() => setShowAccountGate(false)} aria-label="Close">×</button><div className="modal-eyebrow">VideoPromptQA beta</div><h2 id="account-modal-title">Continue the beta on this device.</h2><p>{remainingFreeRuns === 0 ? "You have used the free preview. Enter an email to continue the beta and keep your history on this device." : "Enter an email to continue beyond the free preview on this device."} This does not create an account or sync history.</p><form onSubmit={handleAccountSubmit}><label htmlFor="account-email">Email address</label><input id="account-email" type="email" value={accountEmailInput} onChange={event => setAccountEmailInput(event.target.value)} placeholder="you@studio.com" autoComplete="email" required /><button className="modal-submit" type="submit">Continue on this device <span aria-hidden="true">→</span></button></form><div className="modal-note"><span className="status-dot" /> Local beta gate · no payment · no account yet</div></section></div>}
    </div>
  );
}
