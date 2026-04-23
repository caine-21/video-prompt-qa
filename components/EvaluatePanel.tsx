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
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Prompt
        </h2>
        <div className="flex gap-2">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Example {i + 1}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter a video generation prompt to evaluate…"
        rows={4}
        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none transition-colors"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">{prompt.length} chars</span>
        <button
          onClick={() => onSubmit(prompt)}
          disabled={loading || !prompt.trim()}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing…
            </>
          ) : (
            "Analyze Prompt"
          )}
        </button>
      </div>
    </div>
  );
}
