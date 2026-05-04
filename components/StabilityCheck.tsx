"use client";

import { useState } from "react";
import type { EvaluationResult, AIProvider } from "@/lib/types";

interface Props {
  prompt: string;
  currentProvider: AIProvider;
  currentResult: EvaluationResult;
  defaultOpen?: boolean;
}

const ALL_PROVIDERS: AIProvider[] = ["gemini", "claude", "groq"];
const VARIANCE_THRESHOLD = 1.5;

function scoreColors(score: number) {
  if (score >= 8) return "#FFD93D";
  if (score >= 5) return "#C4B5FD";
  return "#FF6B6B";
}

export default function StabilityCheck({ prompt, currentProvider, currentResult, defaultOpen = false }: Props) {
  const [compareProvider, setCompareProvider] = useState<AIProvider>(
    ALL_PROVIDERS.find(p => p !== currentProvider) ?? "claude"
  );
  const [compareResult, setCompareResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [open, setOpen]                   = useState(defaultOpen);

  async function runCheck() {
    setLoading(true); setError(null); setCompareResult(null);
    try {
      const res  = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, provider: compareProvider }),
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

  // Compute per-dimension variance
  const dimVariance = compareResult
    ? currentResult.dimensions.map(d => {
        const other = compareResult.dimensions.find(x => x.name === d.name);
        if (!other) return null;
        const variance = Math.abs(d.score - other.score);
        return { name: d.name, scoreA: d.score, scoreB: other.score, variance };
      }).filter(Boolean).sort((a, b) => b!.variance - a!.variance)
    : [];

  const highVariance = dimVariance.filter(d => d!.variance >= VARIANCE_THRESHOLD);
  const overallVariance = compareResult
    ? Math.abs(currentResult.overallScore - compareResult.overallScore)
    : 0;

  const otherProviders = ALL_PROVIDERS.filter(p => p !== currentProvider);

  return (
    <div style={{ background: "#FFFDF5", border: "4px solid #000", boxShadow: "8px 8px 0 #000" }}>
      {/* Header / trigger */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12, padding: "16px 24px",
          borderBottom: open ? "3px solid #000" : "none", cursor: "pointer",
        }}
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 2px" }}>
            Evaluator Stability Check
          </p>
          <p style={{ fontWeight: 500, fontSize: 12, opacity: 0.5, margin: 0 }}>
            Re-score with a second provider — detect evaluator variance
          </p>
        </div>
        <span style={{ fontWeight: 700, fontSize: 18, opacity: 0.4 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: "16px 24px" }}>
          {/* Provider selector + run */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5 }}>
              Compare against:
            </span>
            {otherProviders.map(p => (
              <button
                key={p}
                onClick={() => { setCompareProvider(p); setCompareResult(null); }}
                className={`neo-btn ${compareProvider === p ? "neo-btn-active" : "neo-btn-ghost"}`}
                style={{ padding: "4px 14px", fontSize: 12, minHeight: 32 }}
              >
                {p.toUpperCase()}
              </button>
            ))}
            <button
              onClick={runCheck}
              disabled={loading}
              className="neo-btn neo-btn-secondary"
              style={{ minWidth: 140, marginLeft: "auto" }}
            >
              {loading ? <span className="animate-neo-blink">Checking...</span> : "Run Stability Check"}
            </button>
          </div>

          {error && (
            <p style={{ color: "#FF6B6B", fontWeight: 700, fontSize: 13 }}>{error}</p>
          )}

          {compareResult && (
            <>
              {/* Baseline note */}
              <p style={{ fontSize: 11, fontWeight: 500, opacity: 0.45, margin: "0 0 12px", lineHeight: 1.5 }}>
                Variance reflects directional disagreement, not statistical variance — different providers have different scoring baselines.
              </p>

              {/* Overall variance summary */}
              <div style={{
                background: overallVariance >= VARIANCE_THRESHOLD ? "#FF6B6B" : overallVariance > 0 ? "#C4B5FD" : "#FFD93D",
                border: "3px solid #000", padding: "12px 16px", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 16,
              }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6, margin: "0 0 4px" }}>
                    Overall Score Variance
                  </p>
                  <p style={{ fontWeight: 700, fontSize: 32, lineHeight: 1, margin: 0 }}>
                    {overallVariance.toFixed(1)}
                    <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.6 }}> pts</span>
                  </p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 2px" }}>
                    {currentProvider.toUpperCase()}: {currentResult.overallScore} &nbsp;|&nbsp; {compareProvider.toUpperCase()}: {compareResult.overallScore}
                  </p>
                  <p style={{ fontWeight: 500, fontSize: 12, opacity: 0.65, margin: 0 }}>
                    {overallVariance >= VARIANCE_THRESHOLD
                      ? "⚠ High variance — evaluator scores are inconsistent on this prompt"
                      : overallVariance >= 0.5
                        ? "Minor variance — within acceptable range"
                        : "Strong agreement — evaluator is stable on this prompt"}
                  </p>
                </div>
              </div>

              {/* Per-dimension variance */}
              {highVariance.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5, margin: "0 0 10px" }}>
                    ⚠ High-variance dimensions (Δ ≥ {VARIANCE_THRESHOLD})
                  </p>
                  {highVariance.map(d => (
                    <div key={d!.name} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.08)",
                    }}>
                      <span style={{
                        background: "#FF6B6B", border: "2px solid #000",
                        padding: "2px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: "0.06em", minWidth: 140,
                      }}>
                        {d!.name}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ background: scoreColors(d!.scoreA), border: "2px solid #000", padding: "2px 8px", fontWeight: 700, fontSize: 13 }}>
                          {d!.scoreA}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 11, opacity: 0.4 }}>{currentProvider.toUpperCase()}</span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 14, opacity: 0.3 }}>vs</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ background: scoreColors(d!.scoreB), border: "2px solid #000", padding: "2px 8px", fontWeight: 700, fontSize: 13 }}>
                          {d!.scoreB}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 11, opacity: 0.4 }}>{compareProvider.toUpperCase()}</span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 12, opacity: 0.6, marginLeft: "auto" }}>
                        Δ {d!.variance.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Low variance confirmation */}
              {highVariance.length === 0 && (
                <div style={{ background: "#FFD93D", border: "3px solid #000", padding: "12px 16px" }}>
                  <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>
                    All dimensions within variance threshold — evaluator is consistent on this prompt across {currentProvider.toUpperCase()} and {compareProvider.toUpperCase()}.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
