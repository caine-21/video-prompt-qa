"use client";

import { useState } from "react";
import type { EvaluationResult } from "@/lib/types";
import PromptAnatomy from "@/components/PromptAnatomy";
import ModelFit from "@/components/ModelFit";

interface Props {
  result: EvaluationResult;
  onImprove?: (result: EvaluationResult) => void;
  improving?: boolean;
}

function scoreColors(score: number) {
  if (score >= 8) return { bg: "#FFD93D", text: "#000" };
  if (score >= 5) return { bg: "#C4B5FD", text: "#000" };
  return { bg: "#FF6B6B", text: "#000" };
}

function scoreLabel(score: number) {
  if (score >= 8) return "Strong";
  if (score >= 5) return "Acceptable";
  return "Needs Work";
}

function ScoreBar({ score, onColoredBg = false }: { score: number; onColoredBg?: boolean }) {
  const { bg } = scoreColors(score);
  const fillColor  = onColoredBg ? "#000" : bg;
  const trackColor = onColoredBg ? "rgba(0,0,0,0.12)" : "#FFFDF5";
  const badgeBg    = onColoredBg ? "rgba(0,0,0,0.15)" : bg;
  const badgeBorder = onColoredBg ? "2px solid rgba(0,0,0,0.5)" : "2px solid #000";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 120, height: 16,
        border: `3px solid ${onColoredBg ? "rgba(0,0,0,0.4)" : "#000"}`,
        background: trackColor,
        position: "relative", overflow: "hidden", flexShrink: 0,
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${score * 10}%`, background: fillColor }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 13, background: badgeBg, border: badgeBorder, padding: "1px 8px", minWidth: 44, textAlign: "center", display: "inline-block" }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function NegativePrompts({ prompts }: { prompts: string[] }) {
  const [copied, setCopied] = useState(false);

  function copyAll() {
    navigator.clipboard.writeText(prompts.join(", ")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="neo-card">
      <div className="neo-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Negative Prompts — Add these to avoid common failures</span>
        <button
          onClick={copyAll}
          style={{
            background: copied ? "#FFD93D" : "transparent",
            border: "2px solid rgba(255,255,255,0.5)",
            color: copied ? "#000" : "#fff",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "2px 10px",
            cursor: "pointer",
            fontFamily: "var(--font-space-grotesk), sans-serif",
            transition: "background 150ms, color 150ms",
          }}
        >
          {copied ? "Copied!" : "Copy All"}
        </button>
      </div>
      <div className="px-6 py-5" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {prompts.map((term, i) => (
          <span
            key={i}
            style={{
              border: "3px solid #000",
              background: "#FFFDF5",
              padding: "6px 14px",
              fontWeight: 700,
              fontSize: 13,
              boxShadow: "3px 3px 0 #000",
            }}
          >
            {term}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EvaluationReport({ result, onImprove, improving }: Props) {
  const overallColors = scoreColors(result.overallScore);

  return (
    <div className="space-y-5">

      {/* ── Overall score ── */}
      <div className="neo-card" style={{ background: overallColors.bg }}>
        <div className="flex items-center justify-between flex-wrap gap-4 px-6 py-5">
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.6, margin: "0 0 6px" }}>
              Overall Score — via {result.provider.toUpperCase()}
            </p>
            <div className="flex items-baseline gap-2">
              <span style={{ fontSize: 80, fontWeight: 700, lineHeight: 1 }}>{result.overallScore}</span>
              <span style={{ fontSize: 28, fontWeight: 700, opacity: 0.5 }}>/10</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "6px 0 0" }}>
              {scoreLabel(result.overallScore)}
            </p>
          </div>

          <div style={{ minWidth: 280 }}>
            {result.dimensions.map((d) => (
              <div key={d.name} className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 130 }}>
                  {d.name}
                </span>
                <ScoreBar score={d.score} onColoredBg />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Evaluated Prompt ── */}
      <div className="neo-card">
        <div className="neo-bar">Evaluated Prompt</div>
        <div className="px-6 py-4" style={{ fontSize: 15, lineHeight: 1.6, fontWeight: 500 }}>
          &ldquo;{result.prompt}&rdquo;
        </div>
      </div>

      {/* ── Prompt Anatomy (NEW) ── */}
      {result.anatomy && result.anatomy.length > 0 && (
        <PromptAnatomy anatomy={result.anatomy} />
      )}

      {/* ── Dimension breakdown ── */}
      <div className="neo-card">
        <div className="neo-bar">Dimension Analysis</div>
        <div>
          {result.dimensions.map((dim, i) => {
            const colors = scoreColors(dim.score);
            return (
              <div key={dim.name} className="px-6 py-5" style={{ borderBottom: i < result.dimensions.length - 1 ? "3px solid #000" : "none" }}>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span style={{ background: colors.bg, border: "3px solid #000", padding: "3px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {dim.name}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.5 }}>
                      {scoreLabel(dim.score)}
                    </span>
                  </div>
                  <ScoreBar score={dim.score} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, color: "rgba(0,0,0,0.7)", margin: 0, lineHeight: 1.55 }}>
                  {dim.feedback}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── AI Improve CTA ── */}
      {onImprove && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, background: "#FFFDF5", border: "4px solid #000", boxShadow: "8px 8px 0 #000", padding: "20px 24px" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, margin: "0 0 4px" }}>Let AI fix the weak points automatically</p>
            <p style={{ fontWeight: 500, fontSize: 13, opacity: 0.55, margin: 0 }}>Rewrites your prompt using the dimension feedback, then re-scores it</p>
          </div>
          <button onClick={() => onImprove(result)} disabled={improving} className="neo-btn neo-btn-secondary" style={{ minWidth: 200 }}>
            {improving ? <span className="animate-neo-blink">Improving...</span> : "✦ AI Improve This Prompt"}
          </button>
        </div>
      )}

      {/* ── Improvements + Edge cases ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="neo-card">
          <div className="neo-bar-secondary">Improvements</div>
          <ul className="px-6 py-4 space-y-3">
            {result.improvements.map((item, i) => (
              <li key={i} className="flex gap-3" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, fontSize: 13, background: "#FFD93D", border: "2px solid #000", width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="neo-card">
          <div className="neo-bar-muted">Edge Cases Detected</div>
          <ul className="px-6 py-4 space-y-3">
            {result.edgeCases.length > 0 ? (
              result.edgeCases.map((item, i) => (
                <li key={i} className="flex gap-3" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, background: "#C4B5FD", border: "2px solid #000", width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    !
                  </span>
                  {item}
                </li>
              ))
            ) : (
              <li style={{ fontSize: 14, fontWeight: 500, opacity: 0.5 }}>No edge cases detected.</li>
            )}
          </ul>
        </div>
      </div>

      {/* ── Negative Prompts (NEW) ── */}
      {result.negativePrompts && result.negativePrompts.length > 0 && (
        <NegativePrompts prompts={result.negativePrompts} />
      )}

      {/* ── Model Fit (NEW) ── */}
      {result.modelFit && result.modelFit.length > 0 && (
        <ModelFit modelFit={result.modelFit} />
      )}
    </div>
  );
}
