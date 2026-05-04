"use client";

import { useState } from "react";

interface Props {
  onSubmit: (promptA: string, promptB: string) => void;
  loading: boolean;
}

const DEFAULT_A = "A lone astronaut walks across a red Martian landscape at sunset, dust swirling around boots, cinematic wide shot";
const DEFAULT_B = "astronaut on mars walking";

export default function ComparePanel({ onSubmit, loading }: Props) {
  const [promptA, setPromptA] = useState(DEFAULT_A);
  const [promptB, setPromptB] = useState(DEFAULT_B);

  return (
    <div className="space-y-4">
      {/* A/B panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Prompt A */}
        <div className="neo-card">
          <div className="neo-bar-accent">Prompt A — Your best version</div>
          <div className="p-4">
            <textarea
              value={promptA}
              onChange={(e) => setPromptA(e.target.value)}
              placeholder="Enter your stronger prompt here..."
              rows={6}
              className="neo-input"
              style={{ fontSize: 14 }}
            />
          </div>
          <div
            className="px-4 pb-3"
            style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4 }}
          >
            {promptA.length} chars
          </div>
        </div>

        {/* Prompt B */}
        <div className="neo-card">
          <div className="neo-bar-secondary">Prompt B — Your challenger</div>
          <div className="p-4">
            <textarea
              value={promptB}
              onChange={(e) => setPromptB(e.target.value)}
              placeholder="Enter the prompt you want to test against A..."
              rows={6}
              className="neo-input"
              style={{ fontSize: 14 }}
            />
          </div>
          <div
            className="px-4 pb-3"
            style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4 }}
          >
            {promptB.length} chars
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={() => onSubmit(promptA, promptB)}
          disabled={loading || !promptA.trim() || !promptB.trim()}
          className="neo-btn neo-btn-primary"
          style={{ minWidth: 220 }}
        >
          {loading ? "Comparing..." : "Run Comparison →"}
        </button>
      </div>
    </div>
  );
}
