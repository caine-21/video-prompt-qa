import type { EvaluationResult } from "@/lib/types";

interface Props {
  result: EvaluationResult;
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color =
    score >= 8 ? "bg-green-500" : score >= 5 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-mono font-bold text-gray-200 w-6 text-right">
        {score}
      </span>
    </div>
  );
}

function overallColor(score: number) {
  if (score >= 8) return "text-green-400";
  if (score >= 5) return "text-yellow-400";
  return "text-red-400";
}

export default function EvaluationReport({ result }: Props) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Overall score */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Overall Score
          </p>
          <p className={`text-5xl font-bold ${overallColor(result.overallScore)}`}>
            {result.overallScore}
            <span className="text-xl text-gray-600 font-normal">/10</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
            via {result.provider}
          </span>
          <p className="text-xs text-gray-600 mt-1">
            {new Date(result.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Dimensions */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Dimension Scores
        </h3>
        {result.dimensions.map((dim) => (
          <div key={dim.name} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">{dim.name}</span>
            </div>
            <ScoreBar score={dim.score} />
            <p className="text-xs text-gray-500">{dim.feedback}</p>
          </div>
        ))}
      </div>

      {/* Improvements + Edge cases */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider">
            Improvements
          </h3>
          <ul className="space-y-2">
            {result.improvements.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-400">
                <span className="text-green-500 shrink-0">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider">
            Edge Cases
          </h3>
          <ul className="space-y-2">
            {result.edgeCases.length > 0 ? (
              result.edgeCases.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-400">
                  <span className="text-orange-500 shrink-0">⚠</span>
                  {item}
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-600">No edge cases detected.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
