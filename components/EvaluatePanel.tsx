"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/lang-context";

const EXAMPLES = [
  "A lone astronaut walks across a red Martian landscape at sunset, dust swirling around boots, cinematic wide shot",
  "cat",
  "A slow-motion shot of a waterfall in a lush jungle, golden hour lighting, 4K, shallow depth of field",
];

interface Props {
  onSubmit: (prompt: string) => void;
  loading: boolean;
}

export default function EvaluatePanel({ onSubmit, loading }: Props) {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState("");

  return (
    <div className="neo-card">
      <div className="neo-bar">{t("eval.ui.title")}</div>

      <div className="px-6 pt-5 pb-2">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.45, marginRight: 4 }}>
            {t("eval.ui.try")}
          </span>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="neo-btn neo-btn-outline"
              style={{ padding: "4px 12px", minHeight: 32, fontSize: 11, boxShadow: "3px 3px 0 #000" }}
            >
              {t("eval.ui.example")} {i + 1}
            </button>
          ))}
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("eval.ui.placeholder")}
          rows={5}
          className="neo-input"
        />
      </div>

      <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "3px solid #000", background: "#FFFDF5" }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.45 }}>
          {prompt.length} {t("eval.ui.chars")}
        </span>
        <button
          onClick={() => onSubmit(prompt)}
          disabled={loading || !prompt.trim()}
          className="neo-btn neo-btn-primary"
          style={{ minWidth: 180 }}
        >
          {loading ? t("eval.ui.loading") : t("eval.ui.submit")}
        </button>
      </div>
    </div>
  );
}
