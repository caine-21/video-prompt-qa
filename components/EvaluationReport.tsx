"use client";

import { useState } from "react";
import type { EvaluationResult } from "@/lib/types";
import PromptAnatomy from "@/components/PromptAnatomy";
import ModelFit from "@/components/ModelFit";
import SubjectWarningCard from "@/components/SubjectWarningCard";
import { useLanguage } from "@/lib/lang-context";
import { resolve } from "@/lib/i18n";

interface Props {
  result: EvaluationResult;
  onImprove?: (result: EvaluationResult) => void;
  improving?: boolean;
}

function scoreColors(score: number) {
  if (score >= 8) return { bg: "#e8f1ea", text: "#2f6b45" };
  if (score >= 5) return { bg: "#f4efe2", text: "#87611e" };
  return { bg: "#fae9e6", text: "#a43c34" };
}

function ScoreBar({ score, onColoredBg = false }: { score: number; onColoredBg?: boolean }) {
  const { bg } = scoreColors(score);
  const fillColor   = onColoredBg ? "#2457a6" : bg;
  const trackColor  = "#ecece8";
  const badgeBg     = bg;
  const badgeBorder = "1px solid #d8d8d2";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 120, height: 6, border: "0", borderRadius: 2, background: trackColor, position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${score * 10}%`, background: fillColor }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 12, color: scoreColors(score).text, background: badgeBg, border: badgeBorder, borderRadius: 4, padding: "2px 7px", minWidth: 40, textAlign: "center", display: "inline-block" }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function NegativePrompts({ prompts }: { prompts: string[] }) {
  const { t } = useLanguage();
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
        <span>{t("eval.report.negprompts")}</span>
        <button
          onClick={copyAll}
          style={{ background: copied ? "#e8f1ea" : "transparent", border: "1px solid #d8d8d2", color: copied ? "#2f6b45" : "#666862", fontSize: 11, fontWeight: 600, padding: "5px 9px", cursor: "pointer" }}
        >
          {copied ? t("eval.report.copied") : t("eval.report.copyall")}
        </button>
      </div>
      <div className="px-6 py-5" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {prompts.map((term, i) => (
          <span key={i} style={{ border: "1px solid #d8d8d2", borderRadius: 4, background: "#fff", padding: "5px 9px", fontWeight: 500, fontSize: 12 }}>
            {term}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EvaluationReport({ result, onImprove, improving }: Props) {
  const { t, lang } = useLanguage();
  const overallColors = scoreColors(result.overallScore);

  function scoreLabel(score: number) {
    if (score >= 8) return t("eval.domain.score.strong");
    if (score >= 5) return t("eval.domain.score.acceptable");
    return t("eval.domain.score.needswork");
  }

  return (
    <div className="space-y-5">

      {/* ── Overall score ── */}
      <div className="neo-card score-summary" style={{ background: overallColors.bg }}>
        <div className="flex items-center justify-between flex-wrap gap-4 px-6 py-5">
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.6, margin: "0 0 6px" }}>
              Overall score
            </p>
            <div className="flex items-baseline gap-2">
              <span style={{ fontSize: 70, fontWeight: 650, lineHeight: 1 }}>{result.overallScore}</span>
              <span style={{ fontSize: 20, fontWeight: 600, opacity: 0.55 }}>/10</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "6px 0 0" }}>
              {scoreLabel(result.overallScore)} · {result.overallScore >= 8 ? "Low review risk" : result.overallScore >= 5 ? "Needs work" : "High review risk"}
            </p>
          </div>

          <div style={{ minWidth: 280 }}>
            {result.dimensions.map((d) => (
              <div key={d.name} className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 11, fontWeight: 600, minWidth: 130 }}>
                  {resolve(`dimension.${d.name}`, lang)}
                </span>
                <ScoreBar score={d.score} onColoredBg />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Subject Warning Card ── */}
      {result.anatomy && result.anatomy.length > 0 && (
        <SubjectWarningCard anatomy={result.anatomy} improvements={result.improvements} />
      )}

      {/* ── Evaluated Prompt ── */}
      <div className="neo-card">
        <div className="neo-bar">{t("eval.report.prompt")}</div>
        <div className="px-6 py-4 prompt-result-text">
          {result.prompt}
        </div>
      </div>

      {/* ── Prompt Anatomy ── */}
      {result.anatomy && result.anatomy.length > 0 && (
        <PromptAnatomy anatomy={result.anatomy} />
      )}

      {/* ── Dimension breakdown ── */}
      <div className="neo-card">
        <div className="neo-bar">{t("eval.report.dimensions")}</div>
        <div>
          {result.dimensions.map((dim, i) => {
              const colors = scoreColors(dim.score);
            return (
              <div key={dim.name} className="px-6 py-5" style={{ borderBottom: i < result.dimensions.length - 1 ? "1px solid #d8d8d2" : "none" }}>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span style={{ color: colors.text, background: colors.bg, border: "1px solid #d8d8d2", borderRadius: 4, padding: "4px 8px", fontSize: 12, fontWeight: 600 }}>
                      {resolve(`dimension.${dim.name}`, lang)}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: colors.text }}>
                      {scoreLabel(dim.score)}
                    </span>
                  </div>
                  <ScoreBar score={dim.score} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 400, color: "#666862", margin: 0, lineHeight: 1.6 }}>
                  {dim.feedback}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Suggested rewrite CTA ── */}
      {onImprove && (
        <div className="rewrite-cta">
          <div>
            <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 4px" }}>Suggested rewrite</p>
            <p style={{ fontWeight: 400, fontSize: 13, color: "#666862", margin: 0 }}>Apply the findings, then run another preflight to compare the result.</p>
          </div>
          <button onClick={() => onImprove(result)} disabled={improving} className="neo-btn neo-btn-secondary" style={{ minWidth: 200 }}>
            {improving ? "Rewriting…" : "Generate rewrite"}
          </button>
        </div>
      )}

      {/* ── Improvements + Edge cases ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="neo-card">
          <div className="neo-bar-secondary">{t("eval.report.improvements")}</div>
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
          <div className="neo-bar-muted">{t("eval.report.edgecases")}</div>
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
              <li style={{ fontSize: 14, fontWeight: 500, opacity: 0.5 }}>{t("eval.report.noedge")}</li>
            )}
          </ul>
        </div>
      </div>

      {/* ── Negative Prompts ── */}
      {result.negativePrompts && result.negativePrompts.length > 0 && (
        <NegativePrompts prompts={result.negativePrompts} />
      )}

      {/* ── Model Fit ── */}
      {result.modelFit && result.modelFit.length > 0 && (
        <ModelFit modelFit={result.modelFit} />
      )}
    </div>
  );
}
