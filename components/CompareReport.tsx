"use client";

import type { CompareResult } from "@/lib/types";

interface Props {
  result: CompareResult;
}

function scoreColors(score: number) {
  if (score >= 8) return { bg: "#e8f1ea", text: "#2f6b45" };
  if (score >= 5) return { bg: "#f4efe2", text: "#87611e" };
  return { bg: "#fae9e6", text: "#a43c34" };
}

function ScoreBar({ score }: { score: number }) {
  const { bg } = scoreColors(score);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 100, height: 6, borderRadius: 2, background: "#ecece8", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${score * 10}%`, background: "#2457a6" }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 12, color: scoreColors(score).text, background: bg, border: "1px solid #d8d8d2", borderRadius: 4, padding: "2px 7px", minWidth: 44, textAlign: "center", display: "inline-block" }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export default function CompareReport({ result }: Props) {
  const { winner, scoreA, scoreB, reasoning, promptA, promptB } = result;

  const winnerBg    = winner === "tie" ? "#f4efe2" : "#edf3fb";

  return (
    <div className="space-y-5">

      <div className="neo-card" style={{ background: winnerBg }}>
        <div className="px-6 py-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.6, margin: "0 0 6px" }}>
              Comparison result
            </p>
            <p style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.02em", margin: 0 }}>
              {winner === "tie" ? "No clear winner" : `${winner === "A" ? "Prompt A" : "Prompt B"} leads`}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6, margin: "0 0 8px" }}>
                Score A
              </p>
              <ScoreBar score={scoreA} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, border: "3px solid #000", padding: "4px 12px", background: "#fff" }}>VS</div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6, margin: "0 0 8px" }}>
                Score B
              </p>
              <ScoreBar score={scoreB} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 compare-result-prompts">
        <div className="neo-card" style={winner === "A" ? { background: "#FF6B6B" } : {}}>
          <div className="neo-bar">
            {winner === "A" ? "Leading direction · Prompt A" : `Prompt A · ${scoreA}/10`}
          </div>
          <div className="px-5 py-4" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6 }}>{promptA}</div>
        </div>
        <div className="neo-card" style={winner === "B" ? { background: "#FFD93D" } : {}}>
          <div className="neo-bar">
            {winner === "B" ? "Leading direction · Prompt B" : `Prompt B · ${scoreB}/10`}
          </div>
          <div className="px-5 py-4" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6 }}>{promptB}</div>
        </div>
      </div>

      <div className="neo-card">
        <div className="neo-bar">Why this direction leads</div>
        <div className="px-6 py-5" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.65, color: "rgba(0,0,0,0.75)" }}>
          {reasoning}
        </div>
      </div>
    </div>
  );
}
