"use client";

import { useState, useEffect } from "react";
import type { HumanFeedback, FeedbackTag } from "@/lib/types";

interface Props {
  onSubmit: (feedback: HumanFeedback) => void;
}

const TAGS: { id: FeedbackTag; label: string }[] = [
  { id: "unclear",     label: "Still unclear"     },
  { id: "too_generic", label: "Too generic"        },
  { id: "wrong_focus", label: "Changed wrong thing"},
  { id: "too_verbose", label: "Became too long"    },
];

const RATINGS = [
  { value: 1 as const, emoji: "▲▲", label: "Clearly better"  },
  { value: 2 as const, emoji: "▲",  label: "Slightly better" },
  { value: 3 as const, emoji: "—",  label: "No improvement"  },
] as const;

export default function FeedbackWidget({ onSubmit }: Props) {
  const [ready, setReady]             = useState(false);
  const [rating, setRating]           = useState<1 | 2 | 3 | null>(null);
  const [tags, setTags]               = useState<FeedbackTag[]>([]);
  const [submitted, setSubmitted]     = useState(false);
  const [countdown, setCountdown]     = useState(4);

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
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  function handleSubmit() {
    if (!rating) return;
    const feedback: HumanFeedback = { rating, ...(rating === 3 && tags.length > 0 ? { tags } : {}) };
    onSubmit(feedback);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div style={{
        background: "#FFFDF5", border: "4px solid #000", boxShadow: "8px 8px 0 #000",
        padding: "20px 24px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>✓</span>
        <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>
          Feedback recorded — this helps calibrate the evaluator.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: "#FFFDF5", border: "4px solid #000", boxShadow: "8px 8px 0 #000",
      padding: "20px 24px",
    }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>
          Did the rewrite actually improve the prompt?
        </p>
        <p style={{ fontSize: 12, fontWeight: 500, opacity: 0.5, margin: 0 }}>
          {ready ? "Compare both prompts above, then rate." : `Read both prompts first — rating unlocks in ${countdown}s`}
        </p>
      </div>

      {/* Rating buttons */}
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
            <div style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{r.label}</div>
          </button>
        ))}
      </div>

      {/* Negative tags — only when rating=3 */}
      {rating === 3 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5, margin: "0 0 8px" }}>
            What went wrong? (optional)
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TAGS.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                style={{
                  border: `2px solid ${tags.includes(tag.id) ? "#000" : "rgba(0,0,0,0.3)"}`,
                  background: tags.includes(tag.id) ? "#FF6B6B" : "#fff",
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                }}
              >
                {tag.label}
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
        Submit Feedback
      </button>
    </div>
  );
}
