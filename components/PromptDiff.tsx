"use client";

import type { AnatomyComponent } from "@/lib/types";

interface DiffToken {
  text: string;
  type: "same" | "added" | "removed";
}

function lcsMatrix(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1].toLowerCase() === b[j-1].toLowerCase()
        ? dp[i-1][j-1] + 1
        : Math.max(dp[i-1][j], dp[i][j-1]);
  return dp;
}

function diffWords(original: string, revised: string): DiffToken[] {
  const a = original.split(/\s+/).filter(Boolean);
  const b = revised.split(/\s+/).filter(Boolean);
  const dp = lcsMatrix(a, b);
  const ops: DiffToken[] = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1].toLowerCase() === b[j-1].toLowerCase()) {
      ops.push({ text: b[j-1], type: "same" });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      ops.push({ text: b[j-1], type: "added" });
      j--;
    } else {
      ops.push({ text: a[i-1], type: "removed" });
      i--;
    }
  }
  return ops.reverse();
}

interface Props {
  originalPrompt: string;
  newPrompt: string;
  originalAnatomy?: AnatomyComponent[];
  newAnatomy?: AnatomyComponent[];
}

const STATUS_COLOR: Record<string, string> = {
  present: "#FFD93D",
  partial: "#C4B5FD",
  absent:  "#FF6B6B",
};

const STATUS_ARROW: Record<string, string> = {
  "absent→present":  "↑ filled",
  "absent→partial":  "↑ partial",
  "partial→present": "↑ complete",
  "present→present": "~ enriched",
  "present→partial": "↓ degraded",
  "partial→absent":  "↓ lost",
  "present→absent":  "↓ lost",
  "partial→partial": "~ unchanged",
  "absent→absent":   "✗ still missing",
};

export default function PromptDiff({ originalPrompt, newPrompt, originalAnatomy, newAnatomy }: Props) {
  const tokens = diffWords(originalPrompt, newPrompt);
  const addedCount   = tokens.filter(t => t.type === "added").length;
  const removedCount = tokens.filter(t => t.type === "removed").length;

  // Anatomy dimension changes
  const dimChanges = originalAnatomy && newAnatomy
    ? originalAnatomy.map(orig => {
        const next = newAnatomy.find(n => n.component === orig.component);
        if (!next) return null;
        const key = `${orig.status}→${next.status}`;
        const changed = orig.status !== next.status || orig.note !== next.note;
        return { component: orig.component, orig, next, key, changed };
      }).filter(Boolean)
    : [];

  const filledDims  = dimChanges.filter(d => d!.orig.status !== "present" && d!.next.status === "present");
  const missingDims = dimChanges.filter(d => d!.next.status === "absent");

  return (
    <div className="neo-card">
      <div className="neo-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Prompt Diff — What Changed</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", opacity: 0.7 }}>
          +{addedCount} words · -{removedCount} words
        </span>
      </div>

      {/* Word-level diff */}
      <div style={{ padding: "16px 24px", borderBottom: "3px solid #000", lineHeight: 2, fontSize: 14, fontWeight: 500 }}>
        {tokens.map((t, i) => {
          if (t.type === "same") {
            return <span key={i}>{t.text} </span>;
          }
          if (t.type === "added") {
            return (
              <span key={i} style={{
                background: "#FFD93D", border: "2px solid #000",
                padding: "1px 4px", margin: "0 2px", fontWeight: 700,
              }}>
                {t.text}
              </span>
            );
          }
          return (
            <span key={i} style={{
              background: "#FF6B6B", border: "2px solid #000",
              padding: "1px 4px", margin: "0 2px", fontWeight: 700,
              textDecoration: "line-through", opacity: 0.7,
            }}>
              {t.text}
            </span>
          );
        })}
      </div>

      {/* Anatomy dimension changes */}
      {dimChanges.length > 0 && (
        <div style={{ padding: "14px 24px 6px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5, margin: "0 0 12px" }}>
            Dimension Impact
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0" }}>
            {dimChanges.map(d => {
              if (!d) return null;
              const arrowLabel = STATUS_ARROW[d.key] ?? "→";
              const changed = d.changed;
              return (
                <div key={d.component} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.08)",
                  opacity: changed ? 1 : 0.4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 160 }}>
                    <span style={{
                      background: STATUS_COLOR[d.orig.status], border: "2px solid #000",
                      width: 18, height: 18, fontSize: 9, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {d.orig.status[0].toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, opacity: 0.4 }}>→</span>
                    <span style={{
                      background: STATUS_COLOR[d.next.status], border: "2px solid #000",
                      width: 18, height: 18, fontSize: 9, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {d.next.status[0].toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {d.component}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                      color: d.key.includes("filled") || d.key.includes("present") ? "#000" : "rgba(0,0,0,0.5)",
                    }}>
                      {arrowLabel}
                    </span>
                    {d.next.note && (
                      <p style={{ fontSize: 11, fontWeight: 500, color: "rgba(0,0,0,0.55)", margin: "2px 0 0", lineHeight: 1.3 }}>
                        "{d.next.note}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Diagnosis: still-missing dimensions */}
      {missingDims.length > 0 && (
        <div style={{ borderTop: "3px solid #000", padding: "12px 24px", background: "rgba(255,107,107,0.08)" }}>
          <p style={{ fontWeight: 700, fontSize: 12, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Potential missing components: {missingDims.map(d => d!.component).join(", ")}
          </p>
          <p style={{ fontSize: 12, fontWeight: 500, opacity: 0.6, margin: 0 }}>
            Not addressed by the rewrite — may be intentional for minimal or stylized prompts.
          </p>
        </div>
      )}

      {/* Diagnosis: what was filled */}
      {filledDims.length > 0 && missingDims.length === 0 && (
        <div style={{ borderTop: "3px solid #000", padding: "12px 24px", background: "#FFD93D" }}>
          <p style={{ fontWeight: 700, fontSize: 12, margin: 0 }}>
            Filled: {filledDims.map(d => d!.component).join(", ")} — all absent dimensions addressed.
          </p>
        </div>
      )}
    </div>
  );
}
