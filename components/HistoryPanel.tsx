"use client";

import { useState } from "react";
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

function FeedbackBadge({ rating }: { rating: 1 | 2 | 3 }) {
  const cfg = {
    1: { bg: "#FFD93D", label: "▲▲" },
    2: { bg: "#C4B5FD", label: "▲"  },
    3: { bg: "#FF6B6B", label: "—"  },
  }[rating];
  return (
    <span style={{
      background: cfg.bg, border: "2px solid #000",
      padding: "1px 6px", fontSize: 11, fontWeight: 700,
    }}>
      {cfg.label}
    </span>
  );
}

type Filter = "all" | "negative";
type Sort   = "recent" | "delta";

export default function HistoryPanel({ entries, onSelect, onClear }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort]     = useState<Sort>("recent");

  if (entries.length === 0) {
    return (
      <div className="neo-card" style={{ padding: "24px", textAlign: "center" }}>
        <p style={{ fontWeight: 700, fontSize: 14, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
          No evaluations yet — score a prompt to start building history
        </p>
      </div>
    );
  }

  const filtered = entries
    .filter(e => filter === "all" || (e.feedback?.rating === 3))
    .sort((a, b) => {
      if (sort === "delta") {
        const da = a.deltaScore ?? -Infinity;
        const db = b.deltaScore ?? -Infinity;
        return db - da;
      }
      return 0; // "recent" preserves insertion order (already newest-first)
    });

  const negativeCount = entries.filter(e => e.feedback?.rating === 3).length;

  return (
    <div className="neo-card">
      <div className="neo-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span>History — {entries.length} evaluation{entries.length !== 1 ? "s" : ""}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Filter */}
          <button
            onClick={() => setFilter(f => f === "all" ? "negative" : "all")}
            style={{
              background: filter === "negative" ? "#FF6B6B" : "transparent",
              border: "2px solid rgba(255,255,255,0.5)",
              color: "#fff",
              fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "2px 10px", cursor: "pointer",
              fontFamily: "var(--font-space-grotesk), sans-serif",
            }}
          >
            {filter === "negative" ? `Showing ${negativeCount} — ` : ""}
            {filter === "negative" ? "All" : `👎 Only (${negativeCount})`}
          </button>

          {/* Sort */}
          <button
            onClick={() => setSort(s => s === "recent" ? "delta" : "recent")}
            style={{
              background: "transparent",
              border: "2px solid rgba(255,255,255,0.5)",
              color: "#fff",
              fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "2px 10px", cursor: "pointer",
              fontFamily: "var(--font-space-grotesk), sans-serif",
            }}
          >
            Sort: {sort === "recent" ? "Recent" : "Δ Score"}
          </button>

          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.3)" }} />

          <button
            onClick={onClear}
            style={{
              background: "transparent", border: "2px solid rgba(255,255,255,0.4)", color: "#fff",
              fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "2px 10px", cursor: "pointer",
              fontFamily: "var(--font-space-grotesk), sans-serif",
            }}
          >
            Clear All
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "24px", textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: 13, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            No negative-feedback entries yet
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 0, minWidth: "max-content" }}>
            {filtered.map((entry, i) => {
              const colors = scoreColors(entry.result.overallScore);
              const truncated = entry.result.prompt.length > 55
                ? entry.result.prompt.slice(0, 55) + "…"
                : entry.result.prompt;

              return (
                <button
                  key={entry.id}
                  onClick={() => onSelect(entry.result)}
                  style={{
                    display: "block", textAlign: "left", background: "#fff",
                    border: "none", borderRight: i < filtered.length - 1 ? "3px solid #000" : "none",
                    padding: "16px 20px", width: 220, flexShrink: 0, cursor: "pointer",
                    fontFamily: "var(--font-space-grotesk), sans-serif",
                    transition: "background 100ms ease-linear",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FFFDF5")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ background: colors.bg, border: "2px solid #000", padding: "2px 8px", fontSize: 13, fontWeight: 700 }}>
                      {entry.result.overallScore}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.4 }}>
                      {timeAgo(entry.result.timestamp)}
                    </span>
                  </div>

                  <p style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, margin: "0 0 8px", color: "rgba(0,0,0,0.7)" }}>
                    {truncated}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.35 }}>
                      {entry.result.provider.toUpperCase()}
                    </span>
                    {entry.deltaScore !== undefined && (
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: entry.deltaScore > 0 ? "#000" : entry.deltaScore < 0 ? "#FF6B6B" : "rgba(0,0,0,0.4)",
                      }}>
                        {entry.deltaScore > 0 ? `+${entry.deltaScore}` : entry.deltaScore === 0 ? "±0" : `${entry.deltaScore}`}
                      </span>
                    )}
                    {entry.feedback && <FeedbackBadge rating={entry.feedback.rating} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
