"use client";

import { useState } from "react";

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
  const [prompt, setPrompt] = useState("");

  return (
    <div className="neo-card">
      <div className="neo-bar">Enter your video prompt</div>

      <div className="px-6 pt-5 pb-2">
        {/* Example buttons */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            opacity: 0.45,
            marginRight: 4,
          }}>
            Try an example:
          </span>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="neo-btn neo-btn-outline"
              style={{ padding: "4px 12px", minHeight: 32, fontSize: 11, boxShadow: "3px 3px 0 #000" }}
            >
              Example {i + 1}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your video scene — subject, action, style, lighting, camera movement..."
          rows={5}
          className="neo-input"
        />
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderTop: "3px solid #000", background: "#FFFDF5" }}
      >
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          opacity: 0.45,
        }}>
          {prompt.length} chars
        </span>
        <button
          onClick={() => onSubmit(prompt)}
          disabled={loading || !prompt.trim()}
          className="neo-btn neo-btn-primary"
          style={{ minWidth: 180 }}
        >
          {loading ? "Analyzing..." : "Score This Prompt →"}
        </button>
      </div>
    </div>
  );
}
