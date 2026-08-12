"use client";

import { useState } from "react";

interface Props {
  onSubmit: (prompts: string[]) => void;
  loading: boolean;
}

const DEFAULTS = [
  "A lone astronaut walks across a red Martian landscape at sunset, dust swirling around boots, cinematic wide shot",
  "astronaut on mars walking",
  "Close-up of weathered astronaut visor reflecting Mars terrain, slow dolly push, golden hour, dramatic silence",
];

const MAX_PROMPTS = 5;
const MIN_PROMPTS = 2;

export default function TournamentPanel({ onSubmit, loading }: Props) {
  const [prompts, setPrompts] = useState<string[]>(DEFAULTS);

  function update(i: number, val: string) {
    setPrompts((prev) => prev.map((p, idx) => (idx === i ? val : p)));
  }

  function add() {
    if (prompts.length < MAX_PROMPTS) setPrompts((prev) => [...prev, ""]);
  }

  function remove(i: number) {
    if (prompts.length > MIN_PROMPTS) setPrompts((prev) => prev.filter((_, idx) => idx !== i));
  }

  const canSubmit = !loading && prompts.filter((p) => p.trim()).length >= MIN_PROMPTS;

  return (
    <div className="tournament-editor">
      <p className="editor-description">Rank 2–5 directions through pairwise evaluation. Use it when several prompts are close enough that a single score is not useful.</p>
      <div className="tournament-list">
        {prompts.map((prompt, i) => (
          <div key={i} className="tournament-row">
            <div className="tournament-row-meta"><span className="compare-letter">{String.fromCharCode(65 + i)}</span><div><strong>Prompt {String.fromCharCode(65 + i)}</strong><span>{prompt.length.toLocaleString()} characters</span></div>
              {prompts.length > MIN_PROMPTS && (
                <button type="button" className="text-action" onClick={() => remove(i)}>Remove</button>
              )}
            </div>
            <label className="sr-only" htmlFor={`tournament-prompt-${i}`}>Prompt {String.fromCharCode(65 + i)}</label><textarea id={`tournament-prompt-${i}`} value={prompt} onChange={(e) => update(i, e.target.value)} rows={4} className="prompt-textarea" placeholder={`Enter prompt ${String.fromCharCode(65 + i)}`} />
          </div>
        ))}
      </div>
      <div className="editor-footer editor-footer-standalone">
        {prompts.length < MAX_PROMPTS ? (
          <button type="button" onClick={add} className="secondary-action">+ Add prompt</button>
        ) : <span className="editor-hint">Up to five prompts per tournament.</span>}
        <button type="button" onClick={() => onSubmit(prompts)} disabled={!canSubmit} className="primary-action">{loading ? "Running evaluation…" : "Run tournament"} {!loading && <span aria-hidden="true">→</span>}</button>
      </div>
    </div>
  );
}
