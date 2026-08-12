"use client";

import type { TournamentResult, TournamentRanking } from "@/lib/types";

interface Props {
  result: TournamentResult;
}

const MEDALS = ["1", "2", "3", "4", "5"];

function ScoreBar({ score }: { score: number }) {
  const bg = score >= 8 ? "#e8f1ea" : score >= 5 ? "#f4efe2" : "#fae9e6";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 6, borderRadius: 2, background: "#ecece8", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${score * 10}%`, background: "#2457a6" }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 12, background: bg, border: "1px solid #d8d8d2", borderRadius: 4, padding: "2px 6px", minWidth: 36, textAlign: "center", display: "inline-block" }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function RankRow({ ranking, pos }: { ranking: TournamentRanking; pos: number }) {
  const isChampion = pos === 0;
  const bg = isChampion ? "#edf3fb" : "transparent";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 48px 48px 48px 120px",
        gap: 12,
        alignItems: "center",
        padding: "12px 16px",
        background: bg,
        borderBottom: "1px solid #d8d8d2",
        fontWeight: isChampion ? 700 : 500,
      }}
    >
      <div style={{ fontSize: isChampion ? 20 : 14, fontWeight: 700, textAlign: "center" }}>
        {MEDALS[pos] ?? pos + 1}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.4, wordBreak: "break-word" }}>
        {ranking.prompt.length > 120 ? ranking.prompt.slice(0, 120) + "…" : ranking.prompt}
      </div>
      <div style={{ textAlign: "center" }}>
          <span style={{ background: "#e8f1ea", color: "#2f6b45", fontWeight: 700, fontSize: 11, padding: "3px 7px", border: "1px solid #c6dfcd", borderRadius: 4 }}>
          {ranking.wins}W
        </span>
      </div>
      <div style={{ textAlign: "center", fontSize: 12, opacity: 0.5 }}>{ranking.losses}L</div>
      <div style={{ textAlign: "center", fontSize: 12, opacity: 0.5 }}>{ranking.ties}T</div>
      <ScoreBar score={ranking.avgScore} />
    </div>
  );
}

export default function TournamentReport({ result }: Props) {
  const { rankings, matchups } = result;
  const champion = rankings[0];

  return (
    <div className="space-y-5">

      {/* Champion banner */}
      <div className="neo-card" style={{ background: "#edf3fb" }}>
        <div className="neo-bar">
          Evaluation ranking · leading direction
        </div>
        <div className="px-6 py-5">
          <div style={{ fontSize: 12, fontWeight: 600, color: "#666862", marginBottom: 10 }}>
            Prompt {String.fromCharCode(65 + champion.index)} — {champion.wins}W {champion.losses}L {champion.ties}T — Avg {champion.avgScore}/10
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>{champion.prompt}</div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="neo-card" style={{ overflow: "hidden" }}>
        <div className="neo-bar">Leaderboard</div>
        <div style={{ borderTop: "1px solid #d8d8d2" }}>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 48px 48px 48px 120px",
              gap: 12,
              padding: "8px 16px",
              background: "#f2f2ef",
              color: "#666862",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            <div style={{ textAlign: "center" }}>Rank</div>
            <div>Prompt</div>
            <div style={{ textAlign: "center" }}>Wins</div>
            <div style={{ textAlign: "center" }}>Losses</div>
            <div style={{ textAlign: "center" }}>Ties</div>
            <div>Average</div>
          </div>
          {rankings.map((r, pos) => (
            <RankRow key={r.index} ranking={r} pos={pos} />
          ))}
        </div>
      </div>

      {/* All matchups */}
      <div className="neo-card" style={{ overflow: "hidden" }}>
        <div className="neo-bar">Pairwise findings — {matchups.length} matches</div>
        <div className="space-y-0" style={{ borderTop: "1px solid #d8d8d2" }}>
          {matchups.map((m, idx) => {
            const labelA = `Prompt ${String.fromCharCode(65 + m.indexA)}`;
            const labelB = `Prompt ${String.fromCharCode(65 + m.indexB)}`;
            const winnerLabel = m.winner === "tie" ? "Tie" : m.winner === "A" ? `${labelA} wins` : `${labelB} wins`;
            const winBg = m.winner === "tie" ? "#f4efe2" : "#edf3fb";

            return (
              <div key={idx} style={{ borderBottom: idx < matchups.length - 1 ? "1px solid #d8d8d2" : "none", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, background: "#f2f2ef", border: "1px solid #d8d8d2", borderRadius: 4, padding: "3px 7px" }}>{labelA}</span>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>vs</span>
                    <span style={{ fontWeight: 600, fontSize: 12, background: "#f2f2ef", border: "1px solid #d8d8d2", borderRadius: 4, padding: "3px 7px" }}>{labelB}</span>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 12, background: winBg, border: "1px solid #d8d8d2", borderRadius: 4, padding: "4px 9px" }}>{winnerLabel}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.65)", lineHeight: 1.5 }}>{m.reasoning}</div>
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.6 }}>{labelA}: {m.scoreA}/10</span>
                  <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.6 }}>{labelB}: {m.scoreB}/10</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
