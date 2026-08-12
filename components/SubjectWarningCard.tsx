"use client";

import { useLanguage } from "@/lib/lang-context";
import type { AnatomyComponent } from "@/lib/types";

interface Props {
  anatomy: AnatomyComponent[];
  improvements: string[];
}

const PLACEHOLDER_WORDS = ["something", "someone", "a subject", "an object", "a thing", "an element", "whatever"];

function detectSubjectIssue(anatomy: AnatomyComponent[]): "absent" | "placeholder" | null {
  const subjectEntry = anatomy.find(a => a.component === "Subject");
  if (!subjectEntry) return null;
  if (subjectEntry.status === "absent") return "absent";
  if (subjectEntry.status === "partial") {
    const note = (subjectEntry.note ?? "").toLowerCase();
    if (PLACEHOLDER_WORDS.some(w => note.includes(w))) return "placeholder";
  }
  return null;
}

const SUBJECT_EXAMPLES = [
  "a black cat",
  "an elderly fisherman",
  "a neon-lit street market",
];

export default function SubjectWarningCard({ anatomy, improvements }: Props) {
  const { t } = useLanguage();
  const issue = detectSubjectIssue(anatomy);
  if (!issue) return null;

  const isAbsent = issue === "absent";

  // Pull the subject-fix suggestion from improvements if the LLM generated one
  const fixSuggestion = improvements.find(s =>
    s.toLowerCase().includes("subject") || s.toLowerCase().includes("who or what")
  );

  return (
    <div
      style={{
        background: "#fff7f5",
        border: "1px solid #e6c3bf",
        borderRadius: 8,
        boxShadow: "none",
        padding: "18px 20px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{
          background: "#fae9e6",
          color: "#a43c34",
          fontWeight: 700,
          fontSize: 18,
          border: "1px solid #e6c3bf",
          borderRadius: 4,
          padding: "4px 9px",
          letterSpacing: "0.04em",
        }}>
          ⚠ {isAbsent ? t("warn.absent.title") : t("warn.placeholder.title")}
        </span>
      </div>

      {/* Body */}
      <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 14px", lineHeight: 1.55 }}>
        {isAbsent ? t("warn.absent.body") : t("warn.placeholder.body")}
      </p>

      {/* Two-column: examples + impact */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>
            {t("warn.examples.label")}
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {SUBJECT_EXAMPLES.map(ex => (
              <li key={ex} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#a43c34", fontWeight: 700, fontSize: 11 }}>→</span>
                <span style={{ fontWeight: 600, fontSize: 13, fontFamily: "monospace" }}>{ex}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ borderLeft: "1px solid #e6c3bf", paddingLeft: 24 }}>
          <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>
            {t("warn.impact.label")}
          </p>
          <p style={{ fontWeight: 700, fontSize: 22, margin: "0 0 4px" }}>{t("warn.impact.value")}</p>
          <p style={{ fontWeight: 500, fontSize: 12, opacity: 0.75, margin: 0 }}>{t("warn.impact.suffix")}</p>
        </div>
      </div>

      {/* Fix suggestion from LLM */}
      {fixSuggestion && (
        <div style={{ marginTop: 14, borderTop: "1px solid #e6c3bf", paddingTop: 10 }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: 0, opacity: 0.85 }}>
            {fixSuggestion}
          </p>
        </div>
      )}
    </div>
  );
}
