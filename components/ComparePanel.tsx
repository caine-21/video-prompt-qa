"use client";

import { useState } from "react";

interface Props {
  onSubmit: (promptA: string, promptB: string) => void;
  loading: boolean;
}

export default function ComparePanel({ onSubmit, loading }: Props) {
  const [promptA, setPromptA] = useState(
    "A lone astronaut walks across a red Martian landscape at sunset, dust swirling around boots, cinematic wide shot"
  );
  const [promptB, setPromptB] = useState(
    "astronaut on mars walking"
  );

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Compare Two Prompts
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-purple-400">Prompt A</label>
          <textarea
            value={promptA}
            onChange={(e) => setPromptA(e.target.value)}
            placeholder="Enter prompt A…"
            rows={4}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none transition-colors"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-blue-400">Prompt B</label>
          <textarea
            value={promptB}
            onChange={(e) => setPromptB(e.target.value)}
            placeholder="Enter prompt B…"
            rows={4}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none transition-colors"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSubmit(promptA, promptB)}
          disabled={loading || !promptA.trim() || !promptB.trim()}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Comparing…
            </>
          ) : (
            "Compare Prompts"
          )}
        </button>
      </div>
    </div>
  );
}
