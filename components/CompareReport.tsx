import type { CompareResult } from "@/lib/types";

interface Props {
  result: CompareResult;
}

function ScorePill({ score, highlight }: { score: number; highlight: boolean }) {
  return (
    <span
      className={`text-2xl font-bold ${
        highlight ? "text-purple-300" : "text-gray-500"
      }`}
    >
      {score}
      <span className="text-sm font-normal text-gray-600">/10</span>
    </span>
  );
}

export default function CompareReport({ result }: Props) {
  const { winner, scoreA, scoreB, reasoning, promptA, promptB, provider, timestamp } =
    result;

  const winnerLabel =
    winner === "tie" ? "Tie" : winner === "A" ? "Prompt A wins" : "Prompt B wins";
  const winnerColor =
    winner === "tie"
      ? "text-yellow-400 border-yellow-600"
      : "text-purple-400 border-purple-600";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Winner banner */}
      <div
        className={`bg-gray-900 rounded-xl border p-6 flex items-center justify-between ${winnerColor}`}
      >
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Result</p>
          <p className="text-3xl font-bold">{winnerLabel}</p>
        </div>
        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded self-start">
          via {provider} · {new Date(timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Side by side scores */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`bg-gray-900 rounded-xl border p-5 space-y-2 ${
            winner === "A" ? "border-purple-600" : "border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Prompt A {winner === "A" && "✓"}
            </span>
            <ScorePill score={scoreA} highlight={winner === "A"} />
          </div>
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{promptA}</p>
        </div>

        <div
          className={`bg-gray-900 rounded-xl border p-5 space-y-2 ${
            winner === "B" ? "border-blue-600" : "border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Prompt B {winner === "B" && "✓"}
            </span>
            <ScorePill score={scoreB} highlight={winner === "B"} />
          </div>
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{promptB}</p>
        </div>
      </div>

      {/* Reasoning */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Reasoning
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed">{reasoning}</p>
      </div>
    </div>
  );
}
