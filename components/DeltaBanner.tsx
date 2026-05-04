interface Props {
  originalPrompt: string;
  originalScore: number;
  newScore: number;
}

export default function DeltaBanner({ originalPrompt, originalScore, newScore }: Props) {
  const delta   = Math.round((newScore - originalScore) * 10) / 10;
  const gained  = delta > 0;
  const deltaBg = gained ? "#FFD93D" : "#FF6B6B";

  return (
    <div className="neo-card" style={{ background: "#C4B5FD" }}>
      <div className="neo-bar" style={{ background: "#000", color: "#fff" }}>
        ✦ AI Improvement Complete
      </div>
      <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-6">

        {/* Score delta */}
        <div className="flex items-center gap-4">
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6, margin: "0 0 4px" }}>
              Before
            </p>
            <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, opacity: 0.6 }}>
              {originalScore}
            </span>
          </div>

          <span style={{ fontSize: 28, fontWeight: 700, opacity: 0.4 }}>→</span>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6, margin: "0 0 4px" }}>
              After
            </p>
            <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
              {newScore}
            </span>
          </div>

          <div style={{
            background: deltaBg,
            border: "3px solid #000",
            boxShadow: "3px 3px 0 #000",
            padding: "6px 14px",
            fontWeight: 700,
            fontSize: 20,
          }}>
            {gained ? "+" : ""}{delta}
          </div>
        </div>

        {/* Original prompt */}
        <div style={{ flex: 1, minWidth: 200, maxWidth: 500 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6, margin: "0 0 6px" }}>
            Original prompt
          </p>
          <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5, margin: 0, opacity: 0.75 }}>
            &ldquo;{originalPrompt}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
