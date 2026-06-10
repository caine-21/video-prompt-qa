"use client";

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
        background: "#FF6B6B",
        border: "4px solid #000",
        boxShadow: "8px 8px 0 #000",
        padding: "20px 24px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{
          background: "#000",
          color: "#FF6B6B",
          fontWeight: 700,
          fontSize: 18,
          padding: "4px 12px",
          letterSpacing: "0.04em",
        }}>
          ⚠ {isAbsent ? "SUBJECT MISSING" : "SUBJECT UNCLEAR"}
        </span>
      </div>

      {/* Body */}
      <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 14px", lineHeight: 1.55 }}>
        {isAbsent
          ? "This prompt describes cinematography technique but does not specify what is being filmed. An AI video model will generate random content."
          : "The subject is a placeholder with no referent. Specificity cannot be assessed without knowing what is being filmed."}
      </p>

      {/* Two-column: examples + impact */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>
            Add a specific subject, e.g.
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {SUBJECT_EXAMPLES.map(ex => (
              <li key={ex} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#000", color: "#FF6B6B", fontWeight: 700, fontSize: 11, padding: "1px 6px" }}>→</span>
                <span style={{ fontWeight: 600, fontSize: 13, fontFamily: "monospace" }}>{ex}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ borderLeft: "3px solid rgba(0,0,0,0.25)", paddingLeft: 24 }}>
          <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>
            Expected impact
          </p>
          <p style={{ fontWeight: 700, fontSize: 22, margin: "0 0 4px" }}>Specificity +3–5</p>
          <p style={{ fontWeight: 500, fontSize: 12, opacity: 0.75, margin: 0 }}>points after adding a subject</p>
        </div>
      </div>

      {/* Fix suggestion from LLM */}
      {fixSuggestion && (
        <div style={{ marginTop: 14, borderTop: "2px solid rgba(0,0,0,0.2)", paddingTop: 10 }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: 0, opacity: 0.85 }}>
            {fixSuggestion}
          </p>
        </div>
      )}
    </div>
  );
}
