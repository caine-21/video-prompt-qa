"use client";

import { useState, useEffect } from "react";
import type { EvaluationResult, CompareResult, TournamentResult, AIProvider, HistoryEntry, HumanFeedback } from "@/lib/types";
import { useLanguage } from "@/lib/lang-context";
import ClientProviders from "@/components/ClientProviders";
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
const MAX_HISTORY = 20;

export default function Home() {
  return (
    <ClientProviders>
      <HomeInner />
    </ClientProviders>
  );
}

function HomeInner() {
  const { t, lang, toggleLang } = useLanguage();

  const [tab, setTab]                     = useState<Tab>("evaluate");
  const [provider, setProvider]           = useState<AIProvider>("groq");
  const [evalResult, setEvalResult]       = useState<EvaluationResult | null>(null);
  const [compareResult, setCompareResult]       = useState<CompareResult | null>(null);
  const [tournamentResult, setTournamentResult] = useState<TournamentResult | null>(null);
  const [loading, setLoading]             = useState(false);
  const [improving, setImproving]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [delta, setDelta]                 = useState<{ originalResult: EvaluationResult } | null>(null);
  const [history, setHistory]             = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory]     = useState(false);
  const [pendingFeedbackId, setPendingFeedbackId] = useState<string | null>(null);
  const [demoMode, setDemoMode]           = useState(false);
  const [demoTitle, setDemoTitle]         = useState<string>("");
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }

    const shared = readShareFromURL();
    if (shared) {
      setProvider(shared.provider);
      if (shared.improvedResult) {
        setEvalResult(shared.improvedResult);
        setDelta({ originalResult: shared.result });
      } else {
        setEvalResult(shared.result);
      }
      if (shared.demoMode) {
        setDemoMode(true);
        setDemoTitle(shared.demoTitle ?? "Evaluation Pipeline Demo");
      }
      setTab("evaluate");
    }
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
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `vpqa-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleEvaluate(prompt: string) {
    setLoading(true); setError(null); setEvalResult(null); setDelta(null); setPendingFeedbackId(null); setFallbackNotice(null);
    try {
      const res  = await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, provider }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (data.provider && data.provider !== provider) {
        setFallbackNotice(`${provider.toUpperCase()} unavailable — result from ${data.provider.toUpperCase()}`);
      }
      setEvalResult(data); saveToHistory(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally     { setLoading(false); }
  }

  async function handleCompare(promptA: string, promptB: string) {
    setLoading(true); setError(null); setCompareResult(null); setFallbackNotice(null);
    try {
      const res  = await fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ promptA, promptB, provider }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (data.provider && data.provider !== provider) {
        setFallbackNotice(`${provider.toUpperCase()} unavailable — result from ${data.provider.toUpperCase()}`);
      }
      setCompareResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally     { setLoading(false); }
  }

  async function handleTournament(prompts: string[]) {
    setLoading(true); setError(null); setTournamentResult(null); setFallbackNotice(null);
    try {
      const res  = await fetch("/api/tournament", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompts, provider }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (data.provider && data.provider !== provider) {
        setFallbackNotice(`${provider.toUpperCase()} unavailable — result from ${data.provider.toUpperCase()}`);
      }
      setTournamentResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally     { setLoading(false); }
  }

  async function handleImprove(result: EvaluationResult) {
    setImproving(true); setError(null);
    try {
      const rr = await fetch("/api/rewrite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: result.prompt, dimensions: result.dimensions, improvements: result.improvements, provider }) });
      const rd = await rr.json();
      if (!rr.ok) throw new Error(rd.error);

      const er = await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: rd.improvedPrompt, provider }) });
      const newResult = await er.json();
      if (!er.ok) throw new Error(newResult.error);

      const deltaScore = Math.round((newResult.overallScore - result.overallScore) * 10) / 10;
      setDelta({ originalResult: result });
      setEvalResult(newResult);
      setPendingFeedbackId(saveToHistory(newResult, deltaScore));
    } catch (e) { setError(e instanceof Error ? e.message : "Improvement failed"); }
    finally     { setImproving(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFFDF5" }}>

      {/* ── Header ── */}
      <header style={{ borderBottom: "4px solid #000", background: "#FFFDF5" }}>
        <div className="max-w-6xl mx-auto px-6 pt-6 pb-0">

          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div style={{ background: "#FFD93D", border: "4px solid #000", boxShadow: "4px 4px 0 #000", padding: "6px 16px", display: "inline-block" }}>
                  <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1, textTransform: "uppercase", fontFamily: "var(--font-space-grotesk), sans-serif" }}>
                    VideoPromptQA
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.4 }}>v1.3</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.5)", margin: 0 }}>
                {t("ui.nav.tagline")}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap" style={{ minWidth: 0 }}>
              <button
                onClick={toggleLang}
                className="neo-btn neo-btn-outline"
                style={{ padding: "6px 14px", minHeight: 36, fontSize: 12, fontWeight: 700 }}
                title={lang === "en" ? "切换为中文" : "Switch to English"}
              >
                {lang === "en" ? "中文" : "EN"}
              </button>

              <div style={{ width: 1, height: 24, background: "#000", opacity: 0.2, margin: "0 4px" }} />

              <button
                onClick={() => setShowHistory(s => !s)}
                className={`neo-btn ${showHistory ? "neo-btn-active" : "neo-btn-outline"}`}
                style={{ padding: "6px 14px", minHeight: 36, fontSize: 12 }}
              >
                {t("ui.nav.history")} {history.length > 0 && `(${history.length})`}
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

          <div className="flex mt-5">
            {([
              ["evaluate",   t("ui.nav.tab.evaluate")],
              ["compare",    t("ui.nav.tab.compare")],
              ["tournament", t("ui.nav.tab.tournament")],
            ] as [Tab, string][]).map(([tabKey, label]) => (
              <button
                key={tabKey}
                onClick={() => { setTab(tabKey); setError(null); setDelta(null); setTournamentResult(null); }}
                style={{
                  border: "4px solid #000",
                  borderBottom: tabKey === tab ? "4px solid #FFFDF5" : "4px solid #000",
                  background: tabKey === tab ? "#FFFDF5" : "transparent",
                  color: tabKey === tab ? "#000" : "rgba(0,0,0,0.4)",
                  padding: "10px 24px", fontSize: 13, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.07em", cursor: "pointer",
                  marginBottom: tabKey === tab ? "-4px" : 0,
                  zIndex: tabKey === tab ? 1 : 0, position: "relative",
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

          {demoMode && <DemoModeBanner title={demoTitle} onDismiss={() => setDemoMode(false)} />}

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

          {/* ── Landing Hero: visible only before first evaluation ── */}
          {tab === "evaluate" && !evalResult && !loading && !improving && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 4 }}>

              {/* Statement */}
              <div style={{ maxWidth: 620 }}>
                {t("hero.statement").split("\n").map((line, i) => (
                  <p key={i} style={{ fontSize: i === 0 ? 16 : 14, fontWeight: i === 0 ? 800 : 600, margin: i === 0 ? "0 0 6px" : 0, lineHeight: 1.55, color: i === 0 ? "#000" : "rgba(0,0,0,0.65)" }}>
                    {line}
                  </p>
                ))}
              </div>

              {/* Methodology — horizontal compact */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap", border: "3px solid #000", boxShadow: "4px 4px 0 #000", background: "#FFFDF5", overflow: "hidden", width: "fit-content" }}>
                {([
                  t("hero.step.find"),
                  t("hero.step.experiment"),
                  t("hero.step.rootcause"),
                  t("hero.step.fix"),
                  t("hero.step.validate"),
                  t("hero.step.ship"),
                ] as const).map((step, i, arr) => (
                  <div key={step} style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px" }}>
                      <span style={{ background: "#000", color: "#FFFDF5", fontWeight: 900, fontSize: 9, padding: "1px 6px", flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
                        {step}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <span style={{ fontSize: 10, opacity: 0.3, paddingRight: 2 }}>→</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Proof badges */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[t("hero.badge.cases"), t("hero.badge.experiment"), t("hero.badge.gate")].map(badge => (
                  <span key={badge} style={{ border: "2px solid #000", fontSize: 11, fontWeight: 700, padding: "3px 10px", letterSpacing: "0.04em", background: "transparent" }}>
                    {badge}
                  </span>
                ))}
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <div style={{ flex: 1, height: 2, background: "#000", opacity: 0.1 }} />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.35 }}>{t("hero.divider")}</span>
                <div style={{ flex: 1, height: 2, background: "#000", opacity: 0.1 }} />
              </div>
            </div>
          )}

          {tab === "evaluate"   && <EvaluatePanel   onSubmit={handleEvaluate}   loading={loading} />}
          {tab === "compare"    && <ComparePanel    onSubmit={handleCompare}    loading={loading} />}
          {tab === "tournament" && <TournamentPanel onSubmit={handleTournament} loading={loading} />}

          {fallbackNotice && (
            <div style={{ border: "3px solid #000", background: "#FFD93D", boxShadow: "4px 4px 0 #000", padding: "12px 20px", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>⚠ {fallbackNotice}</span>
              <button onClick={() => setFallbackNotice(null)} style={{ background: "transparent", border: "none", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>×</button>
            </div>
          )}

          {error && (
            <div className="neo-card">
              <div className="neo-bar-accent">{t("ui.nav.error")}</div>
              <div className="px-6 py-4" style={{ fontSize: 15, fontWeight: 700 }}>{error}</div>
            </div>
          )}

          {(loading || improving) && (
            <div className="neo-card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div className="animate-spin-slow" style={{ fontSize: 48, lineHeight: 1, display: "inline-block", marginBottom: 20 }}>★</div>
              <p style={{ fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                {improving ? t("ui.loading.improving") : `${t("ui.loading.analyzing")} ${provider.toUpperCase()}`}
                <span className="animate-neo-blink">...</span>
              </p>
            </div>
          )}

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
              <EvaluationReport result={evalResult} onImprove={handleImprove} improving={improving} />

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <ShareButton
                  provider={provider}
                  result={delta ? delta.originalResult : evalResult}
                  improvedResult={delta ? evalResult : undefined}
                  demoMode
                  demoTitle={delta
                    ? `AI Improve Demo — ${delta.originalResult.overallScore} → ${evalResult.overallScore}`
                    : `Evaluation Demo — ${evalResult.overallScore}/10`}
                />
                <button
                  onClick={() => exportJSON(evalResult)}
                  style={{ background: "transparent", border: "3px solid #000", boxShadow: "4px 4px 0 #000", padding: "8px 18px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer", fontFamily: "var(--font-space-grotesk), sans-serif" }}
                >
                  {t("ui.nav.export")}
                </button>
              </div>

              <StabilityCheck prompt={evalResult.prompt} currentProvider={provider} currentResult={evalResult} defaultOpen={demoMode} />
            </>
          )}

          {compareResult    && tab === "compare"    && <CompareReport    result={compareResult}    />}
          {tournamentResult && tab === "tournament" && <TournamentReport result={tournamentResult} />}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: "#FFD93D", borderTop: "4px solid #000", padding: "16px 24px" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <span style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {t("ui.nav.footer")}
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
