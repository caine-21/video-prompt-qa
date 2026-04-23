"use client";

import { useState } from "react";
import type { EvaluationResult, CompareResult, AIProvider } from "@/lib/types";
import EvaluatePanel from "@/components/EvaluatePanel";
import ComparePanel from "@/components/ComparePanel";
import EvaluationReport from "@/components/EvaluationReport";
import CompareReport from "@/components/CompareReport";

type Tab = "evaluate" | "compare";

export default function Home() {
  const [tab, setTab] = useState<Tab>("evaluate");
  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEvaluate(prompt: string) {
    setLoading(true);
    setError(null);
    setEvalResult(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvalResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare(promptA: string, promptB: string) {
    setLoading(true);
    setError(null);
    setCompareResult(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptA, promptB, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCompareResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">▶</span> VideoPromptQA
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              AI-powered video generation prompt quality tester
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Provider:</span>
            {(["gemini", "claude", "groq"] as AIProvider[]).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  provider === p
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit">
          <button
            onClick={() => { setTab("evaluate"); setError(null); }}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "evaluate"
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Evaluate
          </button>
          <button
            onClick={() => { setTab("compare"); setError(null); }}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "compare"
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Compare A vs B
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {tab === "evaluate" ? (
          <EvaluatePanel onSubmit={handleEvaluate} loading={loading} />
        ) : (
          <ComparePanel onSubmit={handleCompare} loading={loading} />
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {evalResult && tab === "evaluate" && (
          <EvaluationReport result={evalResult} />
        )}

        {compareResult && tab === "compare" && (
          <CompareReport result={compareResult} />
        )}
      </main>
    </div>
  );
}
