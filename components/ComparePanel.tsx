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
    <div className="compare-editor">
      <div className="compare-columns">
        <div className="compare-column">
          <div className="compare-column-heading"><span className="compare-letter">A</span><div><strong>Prompt A</strong><span>Current direction</span></div></div>
          <label className="sr-only" htmlFor="compare-prompt-a">Prompt A</label>
          <textarea id="compare-prompt-a" value={promptA} onChange={(e) => setPromptA(e.target.value)} placeholder="Enter the first direction" rows={8} className="prompt-textarea" />
          <span className="character-count">{promptA.length.toLocaleString()} characters</span>
        </div>
        <div className="compare-divider" aria-hidden="true">VS</div>
        <div className="compare-column">
          <div className="compare-column-heading"><span className="compare-letter compare-letter-alt">B</span><div><strong>Prompt B</strong><span>Challenger direction</span></div></div>
          <label className="sr-only" htmlFor="compare-prompt-b">Prompt B</label>
          <textarea id="compare-prompt-b" value={promptB} onChange={(e) => setPromptB(e.target.value)} placeholder="Enter the second direction" rows={8} className="prompt-textarea" />
          <span className="character-count">{promptB.length.toLocaleString()} characters</span>
        </div>
      </div>
      <div className="editor-footer editor-footer-standalone"><span className="editor-hint">Compare clarity, motion and consistency side by side.</span><button type="button" onClick={() => onSubmit(promptA, promptB)} disabled={loading || !promptA.trim() || !promptB.trim()} className="primary-action">{loading ? "Comparing…" : "Compare prompts"} {!loading && <span aria-hidden="true">→</span>}</button></div>
    </div>
  );
}
