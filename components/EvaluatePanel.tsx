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
    <div className="prompt-editor">
      <div className="example-row" aria-label="Prompt examples">
        <span className="editor-label">Start with an example</span>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrompt(ex)}
              className="example-button"
            >
              Example {i + 1}
            </button>
          ))}
      </div>
      <label className="sr-only" htmlFor="prompt-input">Video prompt</label>
      <textarea
        id="prompt-input"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the subject, action, setting, camera and motion."
        rows={7}
        className="prompt-textarea"
        aria-describedby="prompt-count"
      />
      <div className="editor-footer">
        <span id="prompt-count" className="character-count">{prompt.length.toLocaleString()} characters</span>
        <button
          type="button"
          onClick={() => onSubmit(prompt)}
          disabled={loading || !prompt.trim()}
          className="primary-action"
        >
          {loading ? "Evaluating…" : "Run preflight"} {!loading && <span aria-hidden="true">→</span>}
        </button>
      </div>
    </div>
  );
}
