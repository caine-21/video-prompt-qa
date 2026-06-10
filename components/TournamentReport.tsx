"use client";

import type { TournamentResult, TournamentRanking } from "@/lib/types";
import { useLanguage } from "@/lib/lang-context";

interface Props {
  result: TournamentResult;
}

const RANK_COLORS = ["#FFD93D", "#C4B5FD", "#FF6B6B", "#6BFF9E", "#6BB5FF"];
const MEDALS = ["★", "②", "③", "④", "⑤"];

function ScoreBar({ score }: { score: number }) {
  const bg = score >= 8 ? "#FFD93D" : score >= 5 ? "#C4B5FD" : "#FF6B6B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 14, border: "2px solid #000", background: "#FFFDF5", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${score * 10}%`, background: bg }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 12, background: bg, border: "2px solid #000", padding: "1px 6px", minWidth: 36, textAlign: "center", display: "inline-block" }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function RankRow({ ranking, pos }: { ranking: TournamentRanking; pos: number }) {
  const { t } = useLanguage();
  const isChampion = pos === 0;
  const bg = isChampion ? RANK_COLORS[0] : "transparent";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 48px 48px 48px 120px",
        gap: 12,
        alignItems: "center",
        padding: "12px 16px",
        background: bg,
        borderBottom: "2px solid #000",
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
        <span style={{ background: "#000", color: "#fff", fontWeight: 700, fontSize: 12, padding: "2px 8px", border: "2px solid #000" }}>
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
  const { t } = useLanguage();
  const { rankings, matchups, prompts, provider } = result;
  const champion = rankings[0];

  const SLOT_COLORS = ["#FF6B6B", "#FFD93D", "#C4B5FD", "#6BFF9E", "#6BB5FF"];

  return (
    <div className="space-y-5">

      {/* Champion banner */}
      <div className="neo-card" style={{ background: "#FFD93D" }}>
        <div className="neo-bar" style={{ background: "#FFD93D" }}>
          ★ {t("trn.report.champion")} — {t("trn.report.via")} {provider.toUpperCase()}
        </div>
        <div className="px-6 py-5">
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6, marginBottom: 10 }}>
            {t("trn.ui.promptlabel")} {String.fromCharCode(65 + champion.index)} — {champion.wins}W {champion.losses}L {champion.ties}T — Avg {champion.avgScore}/10
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>{champion.prompt}</div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="neo-card" style={{ overflow: "hidden" }}>
        <div className="neo-bar">{t("trn.report.leaderboard")}</div>
        <div style={{ borderTop: "2px solid #000" }}>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 48px 48px 48px 120px",
              gap: 12,
              padding: "8px 16px",
              background: "#000",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            <div style={{ textAlign: "center" }}>{t("trn.report.rank")}</div>
            <div>{t("trn.ui.promptlabel")}</div>
            <div style={{ textAlign: "center" }}>{t("trn.report.wins")}</div>
            <div style={{ textAlign: "center" }}>{t("trn.report.losses")}</div>
            <div style={{ textAlign: "center" }}>{t("trn.report.ties")}</div>
            <div>{t("trn.report.avgscore")}</div>
          </div>
          {rankings.map((r, pos) => (
            <RankRow key={r.index} ranking={r} pos={pos} />
          ))}
        </div>
      </div>

      {/* All matchups */}
      <div className="neo-card" style={{ overflow: "hidden" }}>
        <div className="neo-bar">{t("trn.report.matchups")} — {matchups.length} {t("trn.report.match")}</div>
        <div className="space-y-0" style={{ borderTop: "2px solid #000" }}>
          {matchups.map((m, idx) => {
            const labelA = `${t("trn.ui.promptlabel")} ${String.fromCharCode(65 + m.indexA)}`;
            const labelB = `${t("trn.ui.promptlabel")} ${String.fromCharCode(65 + m.indexB)}`;
            const winnerLabel = m.winner === "tie" ? "Tie" : m.winner === "A" ? `${labelA} wins` : `${labelB} wins`;
            const winBg = m.winner === "tie" ? "#C4B5FD" : m.winner === "A" ? SLOT_COLORS[m.indexA % SLOT_COLORS.length] : SLOT_COLORS[m.indexB % SLOT_COLORS.length];

            return (
              <div key={idx} style={{ borderBottom: idx < matchups.length - 1 ? "2px solid #000" : "none", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", background: SLOT_COLORS[m.indexA % SLOT_COLORS.length], border: "2px solid #000", padding: "2px 8px" }}>{labelA}</span>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>vs</span>
                    <span style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", background: SLOT_COLORS[m.indexB % SLOT_COLORS.length], border: "2px solid #000", padding: "2px 8px" }}>{labelB}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13, background: winBg, border: "2px solid #000", padding: "3px 12px" }}>{winnerLabel}</span>
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
