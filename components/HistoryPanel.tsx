"use client";

import type { HistoryEntry, EvaluationResult } from "@/lib/types";

interface Props {
  entries: HistoryEntry[];
  onSelect: (result: EvaluationResult) => void;
  onClear: () => void;
}

function scoreColors(score: number) {
  if (score >= 8) return { bg: "#FFD93D", text: "#000" };
  if (score >= 5) return { bg: "#C4B5FD", text: "#000" };
  return { bg: "#FF6B6B", text: "#000" };
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HistoryPanel({ entries, onSelect, onClear }: Props) {
  if (entries.length === 0) {
    return (
      <div className="neo-card" style={{ padding: "24px", textAlign: "center" }}>
        <p style={{ fontWeight: 700, fontSize: 14, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
          No evaluations yet — score a prompt to start building history
        </p>
      </div>
    );
  }

  return (
    <div className="neo-card">
      <div className="neo-bar flex items-center justify-between" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>History — {entries.length} evaluation{entries.length !== 1 ? "s" : ""}</span>
        <button
          onClick={onClear}
          style={{
            background: "transparent",
            border: "2px solid rgba(255,255,255,0.4)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "2px 10px",
            cursor: "pointer",
            fontFamily: "var(--font-space-grotesk), sans-serif",
          }}
        >
          Clear All
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 0, minWidth: "max-content" }}>
          {entries.map((entry, i) => {
            const colors = scoreColors(entry.result.overallScore);
            const truncated = entry.result.prompt.length > 55
              ? entry.result.prompt.slice(0, 55) + "…"
              : entry.result.prompt;

            return (
              <button
                key={entry.id}
                onClick={() => onSelect(entry.result)}
                style={{
                  display: "block",
                  textAlign: "left",
                  background: "#fff",
                  border: "none",
                  borderRight: i < entries.length - 1 ? "3px solid #000" : "none",
                  padding: "16px 20px",
                  width: 220,
                  flexShrink: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                  transition: "background 100ms ease-linear",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#FFFDF5")}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{
                    background: colors.bg,
                    border: "2px solid #000",
                    padding: "2px 8px",
                    fontSize: 13,
                    fontWeight: 700,
                  }}>
                    {entry.result.overallScore}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.4 }}>
                    {timeAgo(entry.result.timestamp)}
                  </span>
                </div>
                <p style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, margin: 0, color: "rgba(0,0,0,0.7)" }}>
                  {truncated}
                </p>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.35, margin: "8px 0 0" }}>
                  {entry.result.provider.toUpperCase()}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
