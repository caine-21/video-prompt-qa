"use client";

import { useState, useEffect } from "react";
import type { EvaluationResult, CompareResult, AIProvider, HistoryEntry, HumanFeedback } from "@/lib/types";
import EvaluatePanel from "@/components/EvaluatePanel";
import ComparePanel from "@/components/ComparePanel";
import EvaluationReport from "@/components/EvaluationReport";
import CompareReport from "@/components/CompareReport";
import DeltaBanner from "@/components/DeltaBanner";
import FeedbackWidget from "@/components/FeedbackWidget";
import PromptDiff from "@/components/PromptDiff";
import StabilityCheck from "@/components/StabilityCheck";
import HistoryPanel from "@/components/HistoryPanel";
import CalibrationPanel from "@/components/CalibrationPanel";

type Tab = "evaluate" | "compare";

const PROVIDERS: AIProvider[] = ["gemini", "claude", "groq"];
const HISTORY_KEY = "vpqa_history";
const MAX_HISTORY = 20;

export default function Home() {
  const [tab, setTab]                     = useState<Tab>("evaluate");
  const [provider, setProvider]           = useState<AIProvider>("groq");
  const [evalResult, setEvalResult]       = useState<EvaluationResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [loading, setLoading]             = useState(false);
  const [improving, setImproving]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [delta, setDelta]                 = useState<{ originalResult: EvaluationResult } | null>(null);
  const [history, setHistory]             = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory]     = useState(false);
  const [pendingFeedbackId, setPendingFeedbackId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  function saveToHistory(result: EvaluationResult, deltaScore?: number): string {
    const entry: HistoryEntry = { id: `${Date.now()}-${Math.random()}`, result, deltaScore };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    return entry.id;
  }

  function handleFeedback(feedback: HumanFeedback) {
    if (!pendingFeedbackId) return;
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

  async function handleEvaluate(prompt: string) {
    setLoading(true); setError(null); setEvalResult(null); setDelta(null); setPendingFeedbackId(null);
    try {
      const res  = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvalResult(data);
      saveToHistory(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare(promptA: string, promptB: string) {
    setLoading(true); setError(null); setCompareResult(null);
    try {
      const res  = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptA, promptB, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCompareResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleImprove(result: EvaluationResult) {
    setImproving(true); setError(null);
    try {
      const rewriteRes = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: result.prompt,
          dimensions: result.dimensions,
          improvements: result.improvements,
          provider,
        }),
      });
      const rewriteData = await rewriteRes.json();
      if (!rewriteRes.ok) throw new Error(rewriteData.error);

      const evalRes = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: rewriteData.improvedPrompt, provider }),
      });
      const newResult = await evalRes.json();
      if (!evalRes.ok) throw new Error(newResult.error);

      const deltaScore = Math.round((newResult.overallScore - result.overallScore) * 10) / 10;
      setDelta({ originalResult: result });
      setEvalResult(newResult);
      const entryId = saveToHistory(newResult, deltaScore);
      setPendingFeedbackId(entryId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Improvement failed");
    } finally {
      setImproving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFFDF5" }}>

      {/* ── Header ── */}
      <header style={{ borderBottom: "4px solid #000", background: "#FFFDF5" }}>
        <div className="max-w-6xl mx-auto px-6 pt-6 pb-0">

          {/* Top row: logo + controls */}
          <div className="flex items-start justify-between gap-6 flex-wrap">

            {/* Logo */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div style={{
                  background: "#FFD93D",
                  border: "4px solid #000",
                  boxShadow: "4px 4px 0 #000",
                  padding: "6px 16px",
                  display: "inline-block",
                }}>
                  <span style={{
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                    textTransform: "uppercase",
                    fontFamily: "var(--font-space-grotesk), sans-serif",
                  }}>
                    VideoPromptQA
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.4 }}>
                  v1.0
                </span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.5)", margin: 0 }}>
                Score AI video prompts across 5 failure-mode dimensions
              </p>
            </div>

            {/* Right controls: history + provider */}
            <div className="flex items-center gap-2 pt-1 flex-wrap" style={{ minWidth: 0 }}>
              <button
                onClick={() => setShowHistory(s => !s)}
                className={`neo-btn ${showHistory ? "neo-btn-active" : "neo-btn-outline"}`}
                style={{ padding: "6px 14px", minHeight: 36, fontSize: 12 }}
              >
                History {history.length > 0 && `(${history.length})`}
              </button>

              <div style={{ width: 1, height: 24, background: "#000", opacity: 0.2, margin: "0 4px" }} />

              {PROVIDERS.map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`neo-btn ${provider === p ? "neo-btn-active" : "neo-btn-ghost"}`}
                  style={{ padding: "6px 14px", minHeight: 36, fontSize: 12 }}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mt-5">
            {([
              ["evaluate", "Score a Prompt"],
              ["compare",  "Compare A vs B"],
            ] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setDelta(null); }}
                style={{
                  border: "4px solid #000",
                  borderBottom: t === tab ? "4px solid #FFFDF5" : "4px solid #000",
                  background: t === tab ? "#FFFDF5" : "transparent",
                  color: t === tab ? "#000" : "rgba(0,0,0,0.4)",
                  padding: "10px 24px",
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  cursor: "pointer",
                  marginBottom: t === tab ? "-4px" : 0,
                  zIndex: t === tab ? 1 : 0,
                  position: "relative",
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="neo-grid" style={{ minHeight: "calc(100vh - 200px)" }}>
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

          {/* History panel + Calibration */}
          {showHistory && (
            <>
              <HistoryPanel
                entries={history}
                onSelect={(result) => { setEvalResult(result); setDelta(null); setPendingFeedbackId(null); setShowHistory(false); setTab("evaluate"); }}
                onClear={clearHistory}
              />
              <CalibrationPanel entries={history} />
            </>
          )}

          {tab === "evaluate" ? (
            <EvaluatePanel onSubmit={handleEvaluate} loading={loading} />
          ) : (
            <ComparePanel onSubmit={handleCompare} loading={loading} />
          )}

          {/* Error */}
          {error && (
            <div className="neo-card">
              <div className="neo-bar-accent">Error</div>
              <div className="px-6 py-4" style={{ fontSize: 15, fontWeight: 700 }}>
                {error}
              </div>
            </div>
          )}

          {/* Loading / Improving */}
          {(loading || improving) && (
            <div className="neo-card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div
                className="animate-spin-slow"
                style={{ fontSize: 48, lineHeight: 1, display: "inline-block", marginBottom: 20 }}
              >
                ★
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                {improving ? "Rewriting & re-scoring" : `Analyzing via ${provider.toUpperCase()}`}
                <span className="animate-neo-blink">...</span>
              </p>
            </div>
          )}

          {/* Delta banner + Prompt Diff + Feedback — shown after improvement */}
          {delta && evalResult && tab === "evaluate" && (
            <>
              <DeltaBanner
                originalPrompt={delta.originalResult.prompt}
                originalScore={delta.originalResult.overallScore}
                newScore={evalResult.overallScore}
              />
              <PromptDiff
                originalPrompt={delta.originalResult.prompt}
                newPrompt={evalResult.prompt}
                originalAnatomy={delta.originalResult.anatomy}
                newAnatomy={evalResult.anatomy}
              />
              {pendingFeedbackId && <FeedbackWidget onSubmit={handleFeedback} />}
            </>
          )}

          {evalResult && tab === "evaluate" && (
            <>
              <EvaluationReport
                result={evalResult}
                onImprove={handleImprove}
                improving={improving}
              />
              <StabilityCheck
                prompt={evalResult.prompt}
                currentProvider={provider}
                currentResult={evalResult}
              />
            </>
          )}

          {compareResult && tab === "compare" && (
            <CompareReport result={compareResult} />
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: "#FFD93D", borderTop: "4px solid #000", padding: "16px 24px" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <span style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            VideoPromptQA — The QA layer for AI video workflows
          </span>
          <a
            href="https://github.com/caine-21/video-prompt-qa"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: 700, fontSize: 12, textDecoration: "none", color: "#000", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "2px solid #000" }}
          >
            github.com/caine-21 ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
