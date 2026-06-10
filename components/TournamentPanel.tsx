"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/lang-context";

interface Props {
  onSubmit: (prompts: string[]) => void;
  loading: boolean;
}

const DEFAULTS = [
  "A lone astronaut walks across a red Martian landscape at sunset, dust swirling around boots, cinematic wide shot",
  "astronaut on mars walking",
  "Close-up of weathered astronaut visor reflecting Mars terrain, slow dolly push, golden hour, dramatic silence",
];

const MAX_PROMPTS = 5;
const MIN_PROMPTS = 2;

export default function TournamentPanel({ onSubmit, loading }: Props) {
  const { t } = useLanguage();
  const [prompts, setPrompts] = useState<string[]>(DEFAULTS);

  function update(i: number, val: string) {
    setPrompts((prev) => prev.map((p, idx) => (idx === i ? val : p)));
  }

  function add() {
    if (prompts.length < MAX_PROMPTS) setPrompts((prev) => [...prev, ""]);
  }

  function remove(i: number) {
    if (prompts.length > MIN_PROMPTS) setPrompts((prev) => prev.filter((_, idx) => idx !== i));
  }

  const canSubmit = !loading && prompts.filter((p) => p.trim()).length >= MIN_PROMPTS;

  const SLOT_COLORS = ["#FF6B6B", "#FFD93D", "#C4B5FD", "#6BFF9E", "#6BB5FF"];

  return (
    <div className="space-y-4">
      <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.5)", margin: 0 }}>
        {t("trn.ui.subtitle")}
      </p>

      <div className="space-y-3">
        {prompts.map((prompt, i) => (
          <div key={i} className="neo-card" style={{ overflow: "hidden" }}>
            <div
              className="neo-bar"
              style={{ background: SLOT_COLORS[i % SLOT_COLORS.length], display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span>{t("trn.ui.promptlabel")} {String.fromCharCode(65 + i)}</span>
              {prompts.length > MIN_PROMPTS && (
                <button
                  onClick={() => remove(i)}
                  style={{ background: "transparent", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "0 4px" }}
                >
                  {t("trn.ui.removeprompt")} ×
                </button>
              )}
            </div>
            <div className="p-4">
              <textarea
                value={prompt}
                onChange={(e) => update(i, e.target.value)}
                rows={4}
                className="neo-input"
                style={{ fontSize: 14 }}
                placeholder={`${t("trn.ui.promptlabel")} ${String.fromCharCode(65 + i)}...`}
              />
            </div>
            <div className="px-4 pb-3" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4 }}>
              {prompt.length} {t("eval.ui.chars")}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        {prompts.length < MAX_PROMPTS ? (
          <button
            onClick={add}
            className="neo-btn neo-btn-outline"
            style={{ fontSize: 13, fontWeight: 700 }}
          >
            {t("trn.ui.addprompt")}
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={() => onSubmit(prompts)}
          disabled={!canSubmit}
          className="neo-btn neo-btn-primary"
          style={{ minWidth: 220 }}
        >
          {loading ? t("trn.ui.loading") : t("trn.ui.submit")}
        </button>
      </div>
    </div>
  );
}
