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
    <div className="t-pane">
      <div className="t-pane-title">INPUT.PROMPT</div>

      <div className="p-4 space-y-3">
        {/* Example buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--t-muted)' }}>{`// load example:`}</span>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="text-xs"
              style={{
                color: 'var(--t-muted)',
                border: '1px solid var(--t-border)',
                padding: '1px 8px',
                background: 'transparent',
                cursor: 'pointer',
                letterSpacing: '0.06em',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.color = 'var(--t-fg)';
                (e.target as HTMLElement).style.borderColor = 'var(--t-fg)';
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.color = 'var(--t-muted)';
                (e.target as HTMLElement).style.borderColor = 'var(--t-border)';
              }}
            >
              eg.{i + 1}
            </button>
          ))}
        </div>

        {/* Prompt input with shell prefix */}
        <div
          style={{ borderTop: '1px solid var(--t-border)', paddingTop: '10px' }}
        >
          <div className="flex items-start gap-2">
            <span className="text-sm shrink-0 pt-0.5 t-glow" style={{ color: 'var(--t-muted)' }}>
              user@vpqa:~$
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="enter video generation prompt..."
              rows={4}
              className="t-input text-sm leading-relaxed"
              style={{ color: 'var(--t-fg)' }}
            />
          </div>
        </div>

        {/* Footer row */}
        <div
          className="flex items-center justify-between"
          style={{ borderTop: '1px solid var(--t-border)', paddingTop: '10px' }}
        >
          <span className="text-xs" style={{ color: 'var(--t-muted)', letterSpacing: '0.06em' }}>
            {`// CHARS: ${String(prompt.length).padStart(4, '0')}`}
          </span>
          <button
            onClick={() => onSubmit(prompt)}
            disabled={loading || !prompt.trim()}
            className="t-btn text-xs"
            style={{ letterSpacing: '0.1em' }}
          >
            {loading ? (
              <span className="animate-blink">ANALYZING...</span>
            ) : (
              "[ ANALYZE_PROMPT --run ]"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
