"use client";

import { useState, useEffect } from "react";
import type { HumanFeedback, FeedbackTag } from "@/lib/types";
import { useLanguage } from "@/lib/lang-context";

interface Props {
  onSubmit: (feedback: HumanFeedback) => void;
}

const RATINGS = [
  { value: 1 as const, emoji: "▲▲", key: "fb.rating.1" as const },
  { value: 2 as const, emoji: "▲",  key: "fb.rating.2" as const },
  { value: 3 as const, emoji: "—",  key: "fb.rating.3" as const },
] as const;

const TAG_KEYS: { id: FeedbackTag; key: "fb.tag.unclear" | "fb.tag.generic" | "fb.tag.focus" | "fb.tag.verbose" }[] = [
  { id: "unclear",     key: "fb.tag.unclear"  },
  { id: "too_generic", key: "fb.tag.generic"  },
  { id: "wrong_focus", key: "fb.tag.focus"    },
  { id: "too_verbose", key: "fb.tag.verbose"  },
];

export default function FeedbackWidget({ onSubmit }: Props) {
  const { t, lang } = useLanguage();
  const [ready, setReady]         = useState(false);
  const [rating, setRating]       = useState<1 | 2 | 3 | null>(null);
  const [tags, setTags]           = useState<FeedbackTag[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); setReady(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function toggleTag(tag: FeedbackTag) {
    setTags(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]);
  }

  function handleSubmit() {
    if (!rating) return;
    onSubmit({ rating, ...(rating === 3 && tags.length > 0 ? { tags } : {}) });
    setSubmitted(true);
  }

  const waitText = lang === "zh"
    ? `${t("fb.wait")} ${countdown} ${t("fb.waitsuffix")}`
    : `${t("fb.wait")} ${countdown}${t("fb.waitsuffix")}`;

  if (submitted) {
    return (
      <div style={{ background: "#FFFDF5", border: "4px solid #000", boxShadow: "8px 8px 0 #000", padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>✓</span>
        <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{t("fb.done")}</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#FFFDF5", border: "4px solid #000", boxShadow: "8px 8px 0 #000", padding: "20px 24px" }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>
          {t("fb.question")}
        </p>
        <p style={{ fontSize: 12, fontWeight: 500, opacity: 0.5, margin: 0 }}>
          {ready ? t("fb.ready") : waitText}
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {RATINGS.map(r => (
          <button
            key={r.value}
            onClick={() => ready && setRating(r.value)}
            disabled={!ready}
            style={{
              flex: 1,
              border: `3px solid ${rating === r.value ? "#000" : "rgba(0,0,0,0.25)"}`,
              background: rating === r.value
                ? (r.value === 1 ? "#FFD93D" : r.value === 2 ? "#C4B5FD" : "#FF6B6B")
                : ready ? "#fff" : "rgba(0,0,0,0.05)",
              padding: "10px 8px",
              cursor: ready ? "pointer" : "not-allowed",
              fontFamily: "var(--font-space-grotesk), sans-serif",
              opacity: ready ? 1 : 0.5,
              transition: "all 120ms ease-linear",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{r.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t(r.key)}</div>
          </button>
        ))}
      </div>

      {rating === 3 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5, margin: "0 0 8px" }}>
            {t("fb.wrong")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TAG_KEYS.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                style={{ border: `2px solid ${tags.includes(tag.id) ? "#000" : "rgba(0,0,0,0.3)"}`, background: tags.includes(tag.id) ? "#FF6B6B" : "#fff", padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-space-grotesk), sans-serif" }}
              >
                {t(tag.key)}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!ready || !rating}
        className="neo-btn neo-btn-secondary"
        style={{ minWidth: 140, opacity: ready && rating ? 1 : 0.4 }}
      >
        {t("fb.submit")}
      </button>
    </div>
  );
}
