"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/lang-context";

interface Props {
  onSubmit: (promptA: string, promptB: string) => void;
  loading: boolean;
}

const DEFAULT_A = "A lone astronaut walks across a red Martian landscape at sunset, dust swirling around boots, cinematic wide shot";
const DEFAULT_B = "astronaut on mars walking";

export default function ComparePanel({ onSubmit, loading }: Props) {
  const { t } = useLanguage();
  const [promptA, setPromptA] = useState(DEFAULT_A);
  const [promptB, setPromptB] = useState(DEFAULT_B);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="neo-card">
          <div className="neo-bar-accent">{t("cmp.ui.promptA")}</div>
          <div className="p-4">
            <textarea
              value={promptA}
              onChange={(e) => setPromptA(e.target.value)}
              placeholder={t("cmp.ui.placeholder.a")}
              rows={6}
              className="neo-input"
              style={{ fontSize: 14 }}
            />
          </div>
          <div className="px-4 pb-3" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4 }}>
            {promptA.length} {t("eval.ui.chars")}
          </div>
        </div>

        <div className="neo-card">
          <div className="neo-bar-secondary">{t("cmp.ui.promptB")}</div>
          <div className="p-4">
            <textarea
              value={promptB}
              onChange={(e) => setPromptB(e.target.value)}
              placeholder={t("cmp.ui.placeholder.b")}
              rows={6}
              className="neo-input"
              style={{ fontSize: 14 }}
            />
          </div>
          <div className="px-4 pb-3" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4 }}>
            {promptB.length} {t("eval.ui.chars")}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSubmit(promptA, promptB)}
          disabled={loading || !promptA.trim() || !promptB.trim()}
          className="neo-btn neo-btn-primary"
          style={{ minWidth: 220 }}
        >
          {loading ? t("cmp.ui.loading") : t("cmp.ui.submit")}
        </button>
      </div>
    </div>
  );
}
