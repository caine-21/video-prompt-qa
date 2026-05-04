import type { AnatomyComponent } from "@/lib/types";

interface Props {
  anatomy: AnatomyComponent[];
}

const STATUS_CONFIG = {
  present: { bg: "#FFD93D", symbol: "✓", label: "Present" },
  partial: { bg: "#C4B5FD", symbol: "~", label: "Partial" },
  absent:  { bg: "#FF6B6B", symbol: "✗", label: "Absent"  },
};

export default function PromptAnatomy({ anatomy }: Props) {
  const presentCount = anatomy.filter(a => a.status === "present").length;
  const partialCount = anatomy.filter(a => a.status === "partial").length;
  const absentCount  = anatomy.filter(a => a.status === "absent").length;

  return (
    <div className="neo-card">
      <div className="neo-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Prompt Anatomy — {anatomy.length} Components</span>
        <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 700, letterSpacing: "0.08em" }}>
          {presentCount} present · {partialCount} partial · {absentCount} absent
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {anatomy.map((item, i) => {
          const cfg = STATUS_CONFIG[item.status];
          const isLast = i === anatomy.length - 1;
          const isOdd = anatomy.length % 2 !== 0;
          return (
            <div
              key={item.component}
              style={{
                padding: "16px 20px",
                borderBottom: i < anatomy.length - (isOdd ? 1 : 2) ? "3px solid #000" : "none",
                borderRight: i % 2 === 0 && !isLast ? "3px solid #000" : "none",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              {/* Status badge */}
              <div style={{
                background: cfg.bg,
                border: "3px solid #000",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 16,
                flexShrink: 0,
              }}>
                {cfg.symbol}
              </div>

              {/* Component info */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}>
                    {item.component}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    opacity: 0.5,
                  }}>
                    {cfg.label}
                  </span>
                </div>
                {item.note ? (
                  <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,0.6)", margin: 0, lineHeight: 1.4 }}>
                    {item.note}
                  </p>
                ) : (
                  <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,0.3)", margin: 0, fontStyle: "italic" }}>
                    not specified
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
