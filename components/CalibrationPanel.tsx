"use client";

import type { HistoryEntry, FeedbackTag } from "@/lib/types";

interface Props {
  entries: HistoryEntry[];
}

const DELTA_THRESHOLD = 1.0;

const TAG_LABELS: Record<FeedbackTag, string> = {
  unclear:     "Still unclear",
  too_generic: "Too generic",
  wrong_focus: "Changed wrong thing",
  too_verbose: "Became too long",
};

function MetricCard({
  label, value, sub, color,
}: {
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <div style={{ background: color, border: "4px solid #000", padding: "20px 24px", flex: 1, minWidth: 180 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.6, margin: "0 0 6px" }}>
        {label}
      </p>
      <p style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, margin: "0 0 4px" }}>{value}</p>
      <p style={{ fontSize: 12, fontWeight: 500, opacity: 0.65, margin: 0, lineHeight: 1.4 }}>{sub}</p>
    </div>
  );
}

export default function CalibrationPanel({ entries }: Props) {
  const rated = entries.filter(e => e.deltaScore !== undefined && e.feedback);
  if (rated.length < 3) return null;

  const total = rated.length;

  const agree = rated.filter(e => {
    const positive = e.feedback!.rating <= 2;
    const highDelta = e.deltaScore! > DELTA_THRESHOLD;
    return (highDelta && positive) || (!highDelta && !positive);
  }).length;

  const falsePositive = rated.filter(e =>
    e.deltaScore! > DELTA_THRESHOLD && e.feedback!.rating === 3
  ).length;

  const falseNegative = rated.filter(e =>
    e.deltaScore! <= DELTA_THRESHOLD && e.feedback!.rating <= 2
  ).length;

  const agreementRate  = Math.round((agree / total) * 100);
  const fpRate         = Math.round((falsePositive / total) * 100);
  const fnRate         = Math.round((falseNegative / total) * 100);

  // Tag frequency from all negative entries
  const tagCounts: Partial<Record<FeedbackTag, number>> = {};
  rated
    .filter(e => e.feedback!.rating === 3 && e.feedback!.tags)
    .forEach(e => e.feedback!.tags!.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }));

  const tagEntries = (Object.entries(tagCounts) as [FeedbackTag, number][])
    .sort((a, b) => b[1] - a[1]);

  const negativeTotal = rated.filter(e => e.feedback!.rating === 3).length;
  const isLowSample = total < 20;

  return (
    <div className="neo-card">
      <div className="neo-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Calibration Metrics</span>
        <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 700, letterSpacing: "0.08em" }}>
          {total} rated sample{total !== 1 ? "s" : ""} · Δ≥{DELTA_THRESHOLD} = meaningful shift (1-10 scale)
          {isLowSample && " · directional only"}
        </span>
      </div>

      {/* Metrics row */}
      <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180, borderRight: "3px solid #000" }}>
          <div style={{ padding: "20px 24px", borderBottom: "none" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.6, margin: "0 0 6px" }}>
              Agreement Rate
            </p>
            <p style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, margin: "0 0 4px" }}>
              {agreementRate}%
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, opacity: 0.65, margin: 0, lineHeight: 1.4 }}>
              Evaluator Δ matches human judgment
            </p>
          </div>
        </div>

        <div style={{
          flex: 1, minWidth: 180,
          background: falsePositive > 0 ? "#FF6B6B" : "#FFFDF5",
          borderRight: "3px solid #000",
        }}>
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.6, margin: "0 0 6px" }}>
              False Positive
            </p>
            <p style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, margin: "0 0 4px" }}>
              {fpRate}%
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, opacity: 0.65, margin: 0, lineHeight: 1.4 }}>
              High Δ score, but human said no improvement
            </p>
          </div>
        </div>

        <div style={{
          flex: 1, minWidth: 180,
          background: falseNegative > 0 ? "#C4B5FD" : "#FFFDF5",
        }}>
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.6, margin: "0 0 6px" }}>
              False Negative
            </p>
            <p style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, margin: "0 0 4px" }}>
              {fnRate}%
            </p>
            <p style={{ fontSize: 12, fontWeight: 500, opacity: 0.65, margin: 0, lineHeight: 1.4 }}>
              Low Δ score, but human saw improvement
            </p>
          </div>
        </div>
      </div>

      {/* Low-sample warning */}
      {isLowSample && (
        <div style={{ borderTop: "3px solid #000", padding: "10px 24px", background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 12, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Directional signal only — {20 - total} more rated sample{20 - total !== 1 ? "s" : ""} needed for stable metrics
          </span>
        </div>
      )}

      {/* Tag frequency */}
      {tagEntries.length > 0 && (
        <>
          <div style={{ borderTop: "3px solid #000", padding: "16px 24px 6px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5, margin: "0 0 14px" }}>
              Failure Mode Distribution — from {negativeTotal} negative case{negativeTotal !== 1 ? "s" : ""}
            </p>
            {tagEntries.map(([tag, count]) => {
              const pct = Math.round((count / negativeTotal) * 100);
              return (
                <div key={tag} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 190 }}>
                    {TAG_LABELS[tag]}
                  </span>
                  <div style={{ flex: 1, height: 14, border: "3px solid #000", background: "#FFFDF5", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${pct}%`, background: "#FF6B6B" }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 40, textAlign: "right" }}>
                    {pct}% <span style={{ opacity: 0.4, fontWeight: 500 }}>({count})</span>
                  </span>
                </div>
              );
            })}
          </div>

          {tagEntries[0] && tagEntries[0][1] / negativeTotal >= 0.5 && tagEntries[0][1] >= 3 && (
            <div style={{ borderTop: "3px solid #000", padding: "14px 24px", background: "#FFD93D" }}>
              <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 4px" }}>
                Repeated pattern: {Math.round(tagEntries[0][1] / negativeTotal * 100)}% of failures tagged as "{TAG_LABELS[tagEntries[0][0]]}"
              </p>
              <p style={{ fontWeight: 500, fontSize: 12, opacity: 0.7, margin: "0 0 6px" }}>
                {tagEntries[0][0] === "too_verbose"  && "Hypothesis: rewrite is over-adding — consider tightening the length constraint."}
                {tagEntries[0][0] === "unclear"      && "Hypothesis: rewrite is not resolving ambiguity — feedback specificity rules may need tightening."}
                {tagEntries[0][0] === "too_generic"  && "Hypothesis: rewrite is adding filler language — force concrete noun/verb substitutions."}
                {tagEntries[0][0] === "wrong_focus"  && "Hypothesis: rewrite is targeting wrong dimensions — review priority sorting logic."}
              </p>
              <p style={{ fontSize: 11, fontWeight: 500, opacity: 0.5, margin: 0 }}>
                Correlation-based signal, not causal. Treat as a hypothesis for targeted improvement.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
