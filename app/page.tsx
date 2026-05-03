"use client";

import { useState } from "react";
import type { EvaluationResult, CompareResult, AIProvider } from "@/lib/types";
import EvaluatePanel from "@/components/EvaluatePanel";
import ComparePanel from "@/components/ComparePanel";
import EvaluationReport from "@/components/EvaluationReport";
import CompareReport from "@/components/CompareReport";

type Tab = "evaluate" | "compare";

const PROVIDERS: AIProvider[] = ["gemini", "claude", "groq"];

export default function Home() {
  const [tab, setTab]                     = useState<Tab>("evaluate");
  const [provider, setProvider]           = useState<AIProvider>("groq");
  const [evalResult, setEvalResult]       = useState<EvaluationResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  async function handleEvaluate(prompt: string) {
    setLoading(true); setError(null); setEvalResult(null);
    try {
      const res  = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvalResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "REQUEST_FAILED");
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
      setError(e instanceof Error ? e.message : "REQUEST_FAILED");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--t-bg)', color: 'var(--t-fg)' }}>

      {/* ── Header ── */}
      <header style={{ borderBottom: '1px solid var(--t-border)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 space-y-3">

          {/* Logo row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-xs t-glow animate-typing"
                style={{ color: 'var(--t-muted)', letterSpacing: '0.05em' }}
              >
                {`// ====================================================`}
              </p>
              <h1
                className="text-lg t-glow animate-glitch"
                style={{ letterSpacing: '0.15em', lineHeight: 1.2 }}
              >
                {`> VIDEOPROMPTQA`}
                <span className="animate-blink" style={{ marginLeft: 2 }}>█</span>
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t-muted)', letterSpacing: '0.08em' }}>
                {`// AI-POWERED VIDEO GENERATION PROMPT QUALITY TESTER`}
              </p>
            </div>

            {/* Provider selector */}
            <div className="flex items-center gap-2 pt-1 flex-shrink-0">
              <span className="text-xs" style={{ color: 'var(--t-muted)' }}>--provider</span>
              {PROVIDERS.map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className="t-btn"
                  style={
                    provider === p
                      ? { background: 'var(--t-fg)', color: 'var(--t-bg)' }
                      : {}
                  }
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tab row */}
          <div className="flex gap-0">
            {([["evaluate", "> EVALUATE"], ["compare", "COMPARE_A_VS_B"]] as [Tab, string][]).map(
              ([t, label]) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); }}
                  className="px-4 py-1 text-xs"
                  style={
                    tab === t
                      ? {
                          background: 'var(--t-fg)',
                          color: 'var(--t-bg)',
                          border: '1px solid var(--t-fg)',
                          letterSpacing: '0.1em',
                        }
                      : {
                          background: 'transparent',
                          color: 'var(--t-muted)',
                          border: '1px solid var(--t-border)',
                          letterSpacing: '0.1em',
                        }
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">

        {tab === "evaluate" ? (
          <EvaluatePanel onSubmit={handleEvaluate} loading={loading} />
        ) : (
          <ComparePanel onSubmit={handleCompare} loading={loading} />
        )}

        {/* Error */}
        {error && (
          <div className="t-pane">
            <div className="t-pane-title error">[ERR] EXECUTION_FAILED</div>
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--t-error)' }}>
              {`! ${error}`}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="t-pane">
            <div className="t-pane-title">[...] PROCESSING</div>
            <div className="px-4 py-4 text-sm space-y-1" style={{ color: 'var(--t-muted)' }}>
              <p className="animate-blink">{`> Running inference via --provider=${provider}...`}</p>
            </div>
          </div>
        )}

        {evalResult && tab === "evaluate" && (
          <EvaluationReport result={evalResult} />
        )}

        {compareResult && tab === "compare" && (
          <CompareReport result={compareResult} />
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        className="max-w-5xl mx-auto px-6 pb-6 text-xs"
        style={{ color: 'var(--t-muted)', letterSpacing: '0.06em' }}
      >
        {`// SYSTEM READY ── github.com/caine-21/video-prompt-qa`}
      </footer>
    </div>
  );
}
