import type { CompareResult } from "@/lib/types";

interface Props {
  result: CompareResult;
}

function scoreColors(score: number) {
  if (score >= 8) return { bg: "#FFD93D", text: "#000" };
  if (score >= 5) return { bg: "#C4B5FD", text: "#000" };
  return { bg: "#FF6B6B", text: "#000" };
}

function ScoreBar({ score }: { score: number }) {
  const { bg } = scoreColors(score);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 100,
        height: 16,
        border: "3px solid #000",
        background: "#FFFDF5",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0,
          height: "100%", width: `${score * 10}%`,
          background: bg,
        }} />
      </div>
      <span style={{
        fontWeight: 700, fontSize: 13,
        background: bg, border: "2px solid #000",
        padding: "1px 8px", minWidth: 44,
        textAlign: "center", display: "inline-block",
      }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export default function CompareReport({ result }: Props) {
  const { winner, scoreA, scoreB, reasoning, promptA, promptB, provider } = result;

  const winnerLabel = winner === "tie" ? "It's a Tie" : winner === "A" ? "Prompt A Wins" : "Prompt B Wins";
  const winnerBg    = winner === "tie" ? "#C4B5FD" : winner === "A" ? "#FF6B6B" : "#FFD93D";

  return (
    <div className="space-y-5">

      {/* ── Winner banner ── */}
      <div className="neo-card" style={{ background: winnerBg }}>
        <div className="px-6 py-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p style={{
              fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.14em", opacity: 0.6, margin: "0 0 6px",
            }}>
              Result — via {provider.toUpperCase()}
            </p>
            <p style={{
              fontSize: 48, fontWeight: 700, lineHeight: 1,
              textTransform: "uppercase", letterSpacing: "0.02em", margin: 0,
            }}>
              {winnerLabel}
            </p>
          </div>

          {/* Score comparison */}
          <div className="flex items-center gap-6">
            <div style={{ textAlign: "center" }}>
              <p style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.1em", opacity: 0.6, margin: "0 0 8px",
              }}>
                Score A
              </p>
              <ScoreBar score={scoreA} />
            </div>
            <div style={{
              fontSize: 24, fontWeight: 700,
              border: "3px solid #000", padding: "4px 12px",
              background: "#fff",
            }}>
              VS
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.1em", opacity: 0.6, margin: "0 0 8px",
              }}>
                Score B
              </p>
              <ScoreBar score={scoreB} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Side by side prompts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <div
          className="neo-card"
          style={winner === "A" ? { background: "#FF6B6B" } : {}}
        >
          <div className={winner === "A" ? "neo-bar" : "neo-bar-accent"}>
            {winner === "A" ? "★ Winner — Prompt A" : `Prompt A — ${scoreA}/10`}
          </div>
          <div className="px-5 py-4" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6 }}>
            {promptA}
          </div>
        </div>

        <div
          className="neo-card"
          style={winner === "B" ? { background: "#FFD93D" } : {}}
        >
          <div className={winner === "B" ? "neo-bar" : "neo-bar-secondary"}>
            {winner === "B" ? "★ Winner — Prompt B" : `Prompt B — ${scoreB}/10`}
          </div>
          <div className="px-5 py-4" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6 }}>
            {promptB}
          </div>
        </div>
      </div>

      {/* ── Reasoning ── */}
      <div className="neo-card">
        <div className="neo-bar">Why</div>
        <div className="px-6 py-5" style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.65, color: "rgba(0,0,0,0.75)" }}>
          {reasoning}
        </div>
      </div>
    </div>
  );
}
