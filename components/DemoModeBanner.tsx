"use client";

interface Props {
  title: string;
  onDismiss: () => void;
}

export default function DemoModeBanner({ title, onDismiss }: Props) {
  return (
    <div style={{
      background: "#000", color: "#FFD93D",
      border: "4px solid #FFD93D", boxShadow: "8px 8px 0 #FFD93D",
      padding: "16px 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
    }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", opacity: 0.7, margin: "0 0 4px" }}>
          Demo Mode Active
        </p>
        <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{title}</p>
        <p style={{ fontWeight: 500, fontSize: 12, opacity: 0.6, margin: "4px 0 0" }}>
          Scroll down to explore the full evaluation pipeline — Diff, Feedback, Calibration, and Stability Check are pre-loaded.
        </p>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "transparent", border: "2px solid #FFD93D", color: "#FFD93D",
          fontSize: 18, fontWeight: 700, width: 36, height: 36, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          fontFamily: "var(--font-space-grotesk), sans-serif",
        }}
      >
        ✕
      </button>
    </div>
  );
}
