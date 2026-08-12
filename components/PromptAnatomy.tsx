"use client";

import type { AnatomyComponent } from "@/lib/types";
import { useLanguage } from "@/lib/lang-context";
import { resolve } from "@/lib/i18n";

interface Props {
  anatomy: AnatomyComponent[];
}

export default function PromptAnatomy({ anatomy }: Props) {
  const { t, lang } = useLanguage();

  const presentCount = anatomy.filter(a => a.status === "present").length;
  const partialCount = anatomy.filter(a => a.status === "partial").length;
  const absentCount  = anatomy.filter(a => a.status === "absent").length;

  const STATUS_CONFIG = {
    present: { bg: "#e8f1ea", symbol: "✓", label: t("anat.status.present") },
    partial: { bg: "#f4efe2", symbol: "~", label: t("anat.status.partial") },
    absent:  { bg: "#fae9e6", symbol: "✗", label: t("anat.status.absent")  },
  };

  return (
    <div className="neo-card">
      <div className="neo-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>{t("anat.title")} — {anatomy.length} {t("anat.components")}</span>
        <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 700, letterSpacing: "0.08em" }}>
          {presentCount} {t("anat.present")} · {partialCount} {t("anat.partial")} · {absentCount} {t("anat.absent")}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {anatomy.map((item, i) => {
          const cfg    = STATUS_CONFIG[item.status];
          const isLast = i === anatomy.length - 1;
          const isOdd  = anatomy.length % 2 !== 0;
          return (
            <div
              key={item.component}
              style={{
                padding: "16px 20px",
                borderBottom: i < anatomy.length - (isOdd ? 1 : 2) ? "1px solid #d8d8d2" : "none",
                borderRight: i % 2 === 0 && !isLast ? "1px solid #d8d8d2" : "none",
                display: "flex", alignItems: "flex-start", gap: 12,
              }}
            >
              <div style={{ background: cfg.bg, border: "1px solid #d8d8d2", borderRadius: 4, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {cfg.symbol}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {resolve(`anatomy.${item.component}`, lang)}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.5 }}>
                    {cfg.label}
                  </span>
                </div>
                {item.note && item.note !== "null" ? (
                  <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,0.6)", margin: 0, lineHeight: 1.4 }}>{item.note}</p>
                ) : (
                  <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,0.3)", margin: 0, fontStyle: "italic" }}>{t("anat.unspecified")}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
