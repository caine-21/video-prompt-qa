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
    <div className="t-pane">
      <div className="t-pane-title">COMPARE.MODE ── TWO_PROMPT_ANALYSIS</div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">

          {/* Prompt A */}
          <div className="t-pane">
            <div className="t-pane-title">{`PROMPT_A`}</div>
            <div className="p-3 flex items-start gap-2">
              <span className="text-xs shrink-0 pt-0.5" style={{ color: 'var(--t-muted)' }}>
                A:$
              </span>
              <textarea
                value={promptA}
                onChange={(e) => setPromptA(e.target.value)}
                placeholder="enter prompt A..."
                rows={5}
                className="t-input text-xs leading-relaxed"
                style={{ color: 'var(--t-fg)' }}
              />
            </div>
            <div className="px-3 pb-2 text-xs" style={{ color: 'var(--t-muted)' }}>
              {`// CHARS: ${String(promptA.length).padStart(4, '0')}`}
            </div>
          </div>

          {/* Prompt B */}
          <div className="t-pane">
            <div className="t-pane-title amber">{`PROMPT_B`}</div>
            <div className="p-3 flex items-start gap-2">
              <span className="text-xs shrink-0 pt-0.5" style={{ color: 'var(--t-muted)' }}>
                B:$
              </span>
              <textarea
                value={promptB}
                onChange={(e) => setPromptB(e.target.value)}
                placeholder="enter prompt B..."
                rows={5}
                className="t-input text-xs leading-relaxed"
                style={{ color: 'var(--t-amber)' }}
              />
            </div>
            <div className="px-3 pb-2 text-xs" style={{ color: 'var(--t-muted)' }}>
              {`// CHARS: ${String(promptB.length).padStart(4, '0')}`}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div
          className="flex justify-end"
          style={{ borderTop: '1px solid var(--t-border)', paddingTop: '10px' }}
        >
          <button
            onClick={() => onSubmit(promptA, promptB)}
            disabled={loading || !promptA.trim() || !promptB.trim()}
            className="t-btn text-xs"
            style={{ letterSpacing: '0.1em' }}
          >
            {loading ? (
              <span className="animate-blink">COMPARING...</span>
            ) : (
              "[ COMPARE_PROMPTS --run ]"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
