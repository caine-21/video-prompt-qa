"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { EvaluationResult, CompareResult, TournamentResult, AIProvider, HistoryEntry, HumanFeedback } from "@/lib/types";
import { trackBetaEvent, type BetaMode } from "@/lib/beta-telemetry";
import { useLanguage } from "@/lib/lang-context";
import { readShareFromURL } from "@/lib/share";
import EvaluatePanel from "@/components/EvaluatePanel";
import ComparePanel from "@/components/ComparePanel";
import TournamentPanel from "@/components/TournamentPanel";
import EvaluationReport from "@/components/EvaluationReport";
import CompareReport from "@/components/CompareReport";
import TournamentReport from "@/components/TournamentReport";
import DeltaBanner from "@/components/DeltaBanner";
import FeedbackWidget from "@/components/FeedbackWidget";
import PromptDiff from "@/components/PromptDiff";
import StabilityCheck from "@/components/StabilityCheck";
import ShareButton from "@/components/ShareButton";
import DemoModeBanner from "@/components/DemoModeBanner";
import HistoryPanel from "@/components/HistoryPanel";
import CalibrationPanel from "@/components/CalibrationPanel";

type Tab = "evaluate" | "compare" | "tournament";

const PROVIDERS: AIProvider[] = ["groq", "deepseek"];
const HISTORY_KEY = "vpqa_history";
const FREE_TRIAL_KEY = "vpqa_free_runs_v1";
const ACCOUNT_KEY = "vpqa_beta_account_v1";
const MAX_HISTORY = 20;
const FREE_TRIAL_LIMIT = 3;

export default function ModernWorkspace() {
  const { lang, toggleLang } = useLanguage();
  const [tab, setTab] = useState<Tab>("evaluate");
  const [provider, setProvider] = useState<AIProvider>("groq");
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [tournamentResult, setTournamentResult] = useState<TournamentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delta, setDelta] = useState<{ originalResult: EvaluationResult } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingFeedbackId, setPendingFeedbackId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoTitle, setDemoTitle] = useState("");
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [freeUses, setFreeUses] = useState(0);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountEmailInput, setAccountEmailInput] = useState("");
  const [showAccountGate, setShowAccountGate] = useState(false);

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
        trackBetaEvent("beta_landed", { trial_remaining: FREE_TRIAL_LIMIT - initialUses });
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
    trackBetaEvent("beta_gate_submitted", { trial_remaining: remainingFreeRuns });
    try { localStorage.setItem(ACCOUNT_KEY, email); } catch { /* ignore */ }
  }

  function startBetaRun(mode: BetaMode): number {
    trackBetaEvent("beta_run_started", { mode, provider, trial_remaining: remainingFreeRuns });
    return Date.now();
  }

  function completeBetaRun(mode: BetaMode, startedAt: number, data: { actual_provider?: string; provider?: string; fallback?: boolean; overallScore?: number }) {
    trackBetaEvent("beta_run_completed", {
      mode,
      provider,
      actual_provider: data.actual_provider ?? data.provider,
      fallback: data.fallback,
      latency_ms: Date.now() - startedAt,
      trial_remaining: Math.max(0, remainingFreeRuns - 1),
      score: data.overallScore,
      http_status: 200,
    });
  }

  function failBetaRun(mode: BetaMode, startedAt: number, status: number, errorType?: string) {
    const safeErrorType = errorType && /^[a-zA-Z0-9_:-]{1,50}$/.test(errorType) ? errorType : undefined;
    trackBetaEvent("beta_run_failed", {
      mode,
      provider,
      latency_ms: Date.now() - startedAt,
      trial_remaining: remainingFreeRuns,
      http_status: status,
      error_type: safeErrorType ?? (status === 429 ? "rate_limit" : status >= 500 ? "provider_failure" : "request_failed"),
    });
  }

  function handleFeedback(feedback: HumanFeedback) {
    if (!pendingFeedbackId) return;
    setHistory(prev => {
      const entry = prev.find(e => e.id === pendingFeedbackId);
      if (entry?.result.dbId) {
        fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evaluationId: entry.result.dbId, rating: feedback.rating, tags: feedback.tags ?? [], deltaScore: entry.deltaScore }),
        }).catch(() => { /* non-fatal */ });
      }
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

  function setProviderNotice(data: { provider?: string; actual_provider?: string }) {
    const actualProvider = data.actual_provider ?? data.provider;
    if (actualProvider && actualProvider !== provider) {
      setFallbackNotice(`${provider.toUpperCase()} unavailable — result from ${actualProvider.toUpperCase()}`);
    }
  }

  async function handleEvaluate(prompt: string) {
    if (!ensureRunAccess()) return;
    const startedAt = startBetaRun("evaluate");
    let failureTracked = false;
    setLoading(true); setError(null); setEvalResult(null); setDelta(null); setPendingFeedbackId(null); setFallbackNotice(null);
    try {
      const res = await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, provider }) });
      const data = await res.json();
      if (!res.ok) { failureTracked = true; failBetaRun("evaluate", startedAt, res.status, data.errorType); throw new Error(data.error ?? "Request failed"); }
      setProviderNotice(data); setEvalResult(data); saveToHistory(data); consumeFreeRun();
      completeBetaRun("evaluate", startedAt, data);
    } catch (e) { if (!failureTracked) failBetaRun("evaluate", startedAt, 0, "network"); setError(e instanceof Error ? e.message : "Request failed"); }
    finally { setLoading(false); }
  }

  async function handleCompare(promptA: string, promptB: string) {
    if (!ensureRunAccess()) return;
    const startedAt = startBetaRun("compare");
    let failureTracked = false;
    setLoading(true); setError(null); setCompareResult(null); setFallbackNotice(null);
    try {
      const res = await fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ promptA, promptB, provider }) });
      const data = await res.json();
      if (!res.ok) { failureTracked = true; failBetaRun("compare", startedAt, res.status, data.errorType); throw new Error(data.error ?? "Request failed"); }
      setProviderNotice(data); setCompareResult(data); consumeFreeRun();
      completeBetaRun("compare", startedAt, data);
    } catch (e) { if (!failureTracked) failBetaRun("compare", startedAt, 0, "network"); setError(e instanceof Error ? e.message : "Request failed"); }
    finally { setLoading(false); }
  }

  async function handleTournament(prompts: string[]) {
    if (!ensureRunAccess()) return;
    const startedAt = startBetaRun("tournament");
    let failureTracked = false;
    setLoading(true); setError(null); setTournamentResult(null); setFallbackNotice(null);
    try {
      const res = await fetch("/api/tournament", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompts, provider }) });
      const data = await res.json();
      if (!res.ok) { failureTracked = true; failBetaRun("tournament", startedAt, res.status, data.errorType); throw new Error(data.error ?? "Request failed"); }
      setProviderNotice(data); setTournamentResult(data); consumeFreeRun();
      completeBetaRun("tournament", startedAt, data);
    } catch (e) { if (!failureTracked) failBetaRun("tournament", startedAt, 0, "network"); setError(e instanceof Error ? e.message : "Request failed"); }
    finally { setLoading(false); }
  }

  async function handleImprove(result: EvaluationResult) {
    if (!ensureRunAccess()) return;
    const startedAt = startBetaRun("rewrite");
    let failureTracked = false;
    setImproving(true); setError(null);
    try {
      const rr = await fetch("/api/rewrite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: result.prompt, dimensions: result.dimensions, improvements: result.improvements, provider }) });
      const rd = await rr.json();
      if (!rr.ok) { failureTracked = true; failBetaRun("rewrite", startedAt, rr.status, rd.errorType); throw new Error(rd.error); }
      const er = await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: rd.improvedPrompt, provider }) });
      const newResult = await er.json();
      if (!er.ok) { failureTracked = true; failBetaRun("rewrite", startedAt, er.status, newResult.errorType); throw new Error(newResult.error); }
      const deltaScore = Math.round((newResult.overallScore - result.overallScore) * 10) / 10;
      setDelta({ originalResult: result }); setEvalResult(newResult); setPendingFeedbackId(saveToHistory(newResult, deltaScore)); consumeFreeRun();
      completeBetaRun("rewrite", startedAt, newResult);
    } catch (e) { if (!failureTracked) failBetaRun("rewrite", startedAt, 0, "network"); setError(e instanceof Error ? e.message : "Improvement failed"); }
    finally { setImproving(false); }
  }

  function selectTab(nextTab: Tab) {
    setTab(nextTab); setError(null); setDelta(null); setTournamentResult(null); setCompareResult(null);
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">V</div>
          <div><div className="brand-name">VideoPrompt<span>QA</span></div><div className="brand-subtitle">Creative reliability workspace</div></div>
        </div>
        <div className="topbar-actions">
          <div className="usage-pill" aria-label={hasAccount ? "Beta account active" : `${remainingFreeRuns} free runs remaining`}><span className="status-dot" />{hasAccount ? "BETA ACCOUNT" : `${remainingFreeRuns} FREE RUN${remainingFreeRuns === 1 ? "" : "S"}`}</div>
          <button className="topbar-button" onClick={toggleLang} type="button" aria-label="Toggle language">{lang === "en" ? "中文" : "EN"}</button>
          {hasAccount ? (
            <button className="account-chip" type="button" onClick={() => setShowAccountGate(true)} title={accountEmail ?? "Account"}><span className="account-avatar">{accountEmail?.slice(0, 1).toUpperCase()}</span>Account</button>
          ) : <button className="topbar-button topbar-button-primary" type="button" onClick={() => setShowAccountGate(true)}>Sign in</button>}
        </div>
      </header>

      <div className="workspace-layout">
        <aside className="workspace-sidebar">
          <div><div className="sidebar-label">Workspace</div><nav className="sidebar-nav" aria-label="Workspace navigation">
            <button className={`sidebar-nav-item ${tab === "evaluate" ? "is-active" : ""}`} onClick={() => selectTab("evaluate")} type="button"><span className="nav-icon">↗</span> Evaluate prompt</button>
            <button className={`sidebar-nav-item ${showHistory ? "is-active" : ""}`} onClick={() => setShowHistory(value => !value)} type="button"><span className="nav-icon">≡</span> History{history.length > 0 && <span className="nav-count">{history.length}</span>}</button>
            <button className={`sidebar-nav-item ${tab === "compare" ? "is-active" : ""}`} onClick={() => selectTab("compare")} type="button"><span className="nav-icon">⇄</span> Compare prompts</button>
            <button className={`sidebar-nav-item ${tab === "tournament" ? "is-active" : ""}`} onClick={() => selectTab("tournament")} type="button"><span className="nav-icon">✦</span> Prompt tournament</button>
          </nav></div>
          <div className="sidebar-footer"><div className="engine-card"><div className="sidebar-label">Evaluation engine</div><div className="engine-row"><span className="engine-status" /><strong>DeepSeek V4 Flash</strong></div><div className="engine-caption">5 dimensions · structured output</div></div><a className="github-link" href="https://github.com/caine-21/video-prompt-qa" target="_blank" rel="noopener noreferrer">View source <span aria-hidden="true">↗</span></a></div>
        </aside>

        <main className="workspace-main">
          {demoMode && <DemoModeBanner title={demoTitle} onDismiss={() => setDemoMode(false)} />}
          <section className="workspace-intro"><div className="intro-kicker"><span className="kicker-line" /> Video prompt QA / v1.3</div><h1>Make every video prompt <em>production-ready.</em></h1><p>Evaluate clarity, motion, camera direction, and generation risk before you spend a render.</p></section>

          <div className="workspace-toolbar"><div className="tool-tabs" role="tablist" aria-label="Evaluation mode">
            {(["evaluate", "compare", "tournament"] as Tab[]).map(tabKey => <button key={tabKey} className={`tool-tab ${tab === tabKey ? "is-active" : ""}`} onClick={() => selectTab(tabKey)} type="button" role="tab" aria-selected={tab === tabKey}>{tabKey === "evaluate" ? "Single prompt" : tabKey === "compare" ? "A / B compare" : "Tournament"}</button>)}
          </div><div className="provider-control"><span>Evaluator</span><div className="provider-switch" role="group" aria-label="Evaluation model">{PROVIDERS.map(item => <button key={item} className="is-selected" onClick={() => setProvider(item)} type="button">DeepSeek</button>)}</div></div></div>

          {!hasAccount && <div className={`trial-banner ${remainingFreeRuns === 0 ? "is-exhausted" : ""}`}><div><strong>{remainingFreeRuns === 0 ? "Free preview complete" : `${remainingFreeRuns} free evaluation${remainingFreeRuns === 1 ? "" : "s"} left`}</strong><span>{remainingFreeRuns === 0 ? "Sign in to keep testing prompts in this workspace." : "No card required. Your successful runs are saved in this browser."}</span></div><button type="button" onClick={() => remainingFreeRuns === 0 ? setShowAccountGate(true) : undefined} disabled={remainingFreeRuns > 0}>{remainingFreeRuns === 0 ? "Unlock workspace" : "Free beta"}</button></div>}

          {showHistory && <div className="workspace-history"><HistoryPanel entries={history} onSelect={result => { setEvalResult(result); setDelta(null); setPendingFeedbackId(null); setShowHistory(false); setTab("evaluate"); }} onClear={clearHistory} /><CalibrationPanel entries={history} /></div>}

          <section className="composer-frame"><div className="composer-frame-header"><div><div className="section-kicker">Workspace input</div><h2>{tab === "evaluate" ? "Evaluate a video prompt" : tab === "compare" ? "Find the stronger direction" : "Rank multiple directions"}</h2></div><span className="structured-pill"><span className="status-dot" /> Structured output</span></div><div className="composer-content">
            {tab === "evaluate" && <EvaluatePanel onSubmit={handleEvaluate} loading={loading} />}
            {tab === "compare" && <ComparePanel onSubmit={handleCompare} loading={loading} />}
            {tab === "tournament" && <TournamentPanel onSubmit={handleTournament} loading={loading} />}
          </div></section>

          {fallbackNotice && <div className="notice notice-warning" role="status"><span><strong>Provider fallback.</strong> {fallbackNotice}</span><button onClick={() => setFallbackNotice(null)} type="button" aria-label="Dismiss notice">×</button></div>}
          {error && <div className="notice notice-error" role="alert"><span><strong>Evaluation failed.</strong> {error}</span><button onClick={() => setError(null)} type="button" aria-label="Dismiss error">×</button></div>}
          {(loading || improving) && <div className="loading-state" role="status"><div className="loading-orbit"><span /></div><div><strong>{improving ? "Rewriting and re-evaluating" : "Running structured evaluation"}</strong><span>DeepSeek V4 Flash · usually under a minute</span></div></div>}

          {delta && evalResult && tab === "evaluate" && <><DeltaBanner originalPrompt={delta.originalResult.prompt} originalScore={delta.originalResult.overallScore} newScore={evalResult.overallScore} /><PromptDiff originalPrompt={delta.originalResult.prompt} newPrompt={evalResult.prompt} originalAnatomy={delta.originalResult.anatomy} newAnatomy={evalResult.anatomy} />{pendingFeedbackId && <FeedbackWidget onSubmit={handleFeedback} />}</>}

          {evalResult && tab === "evaluate" && <section className="results-frame"><div className="results-frame-header"><div><div className="section-kicker">Evaluation result</div><h2>What the model sees in your prompt</h2></div><div className="result-actions"><ShareButton provider={provider} result={delta ? delta.originalResult : evalResult} improvedResult={delta ? evalResult : undefined} demoMode demoTitle={delta ? `AI Improve Demo — ${delta.originalResult.overallScore} → ${evalResult.overallScore}` : `Evaluation Demo — ${evalResult.overallScore}/10`} /><button className="secondary-action" onClick={() => exportJSON(evalResult)} type="button">Export JSON</button></div></div><EvaluationReport result={evalResult} onImprove={handleImprove} improving={improving} /><StabilityCheck prompt={evalResult.prompt} currentProvider={provider} currentResult={evalResult} defaultOpen={demoMode} /></section>}
          {compareResult && tab === "compare" && <CompareReport result={compareResult} />}
          {tournamentResult && tab === "tournament" && <TournamentReport result={tournamentResult} />}
          <footer className="workspace-footer"><span>Built for prompt decisions before generation.</span><span>DeepSeek V4 Flash · evidence-based model fit · 5 dimensions</span></footer>
        </main>
      </div>

      {showAccountGate && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setShowAccountGate(false); }}><section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-modal-title"><button className="modal-close" type="button" onClick={() => setShowAccountGate(false)} aria-label="Close">×</button><div className="modal-eyebrow">VideoPromptQA beta</div><h2 id="account-modal-title">Keep your evaluation workspace.</h2><p>{remainingFreeRuns === 0 ? "You have used the free preview. Continue with an email to unlock the workspace and keep your history on this device." : "Sign in to save your work and continue beyond the free preview."}</p><form onSubmit={handleAccountSubmit}><label htmlFor="account-email">Email address</label><input id="account-email" type="email" value={accountEmailInput} onChange={event => setAccountEmailInput(event.target.value)} placeholder="you@studio.com" autoComplete="email" required /><button className="modal-submit" type="submit">Continue to workspace <span aria-hidden="true">→</span></button></form><div className="modal-note"><span className="status-dot" /> Beta account gate · no payment required</div></section></div>}
    </div>
  );
}
