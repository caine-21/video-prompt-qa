import type { ModelFitEntry } from "@/lib/types";

interface Props {
  modelFit: ModelFitEntry[];
}

function scoreColors(score: number) {
  if (score >= 8) return "#FFD93D";
  if (score >= 5) return "#C4B5FD";
  return "#FF6B6B";
}

const MODEL_ICONS: Record<string, string> = {
  "Runway Gen-3": "🎬",
  "Sora":         "🌊",
  "Kling":        "⚡",
  "Pika":         "✨",
};

export default function ModelFit({ modelFit }: Props) {
  const sorted = [...modelFit].sort((a, b) => b.score - a.score);
  const bestScore = sorted[0]?.score ?? 0;

  return (
    <div className="neo-card">
      <div className="neo-bar">Model Fit — Which AI video tool to use</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {sorted.map((entry, i) => {
          const isBest = entry.score === bestScore;
          const fillBg = scoreColors(entry.score);
          return (
            <div
              key={entry.model}
              style={{
                padding: "20px",
                background: isBest ? "#FFD93D" : "#fff",
                borderBottom: i < sorted.length - 2 ? "3px solid #000" : "none",
                borderRight: i % 2 === 0 && i < sorted.length - 1 ? "3px solid #000" : "none",
                position: "relative",
              }}
            >
              {isBest && (
                <div style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "#000",
                  color: "#FFD93D",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  padding: "2px 8px",
                  border: "2px solid #000",
                }}>
                  Best Match
                </div>
              )}

              {/* Model name */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{MODEL_ICONS[entry.model] ?? "🎥"}</span>
                <span style={{
                  fontWeight: 700,
                  fontSize: 14,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}>
                  {entry.model}
                </span>
              </div>

              {/* Score bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  flex: 1,
                  height: 14,
                  border: "3px solid #000",
                  background: isBest ? "rgba(0,0,0,0.12)" : "#FFFDF5",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0,
                    height: "100%",
                    width: `${entry.score * 10}%`,
                    background: isBest ? "#000" : fillBg,
                  }} />
                </div>
                <span style={{
                  fontWeight: 700,
                  fontSize: 16,
                  minWidth: 32,
                  textAlign: "right",
                }}>
                  {entry.score}
                </span>
              </div>

              {/* Reason */}
              <p style={{
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 1.5,
                color: isBest ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.6)",
                margin: 0,
              }}>
                {entry.reason}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
