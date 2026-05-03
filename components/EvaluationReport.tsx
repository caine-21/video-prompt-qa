import type { EvaluationResult } from "@/lib/types";

interface Props {
  result: EvaluationResult;
}

function scoreColor(score: number) {
  if (score >= 8) return 'var(--t-fg)';
  if (score >= 5) return 'var(--t-amber)';
  return 'var(--t-error)';
}

function AsciiBar({ score }: { score: number }) {
  const filled = Math.round(score);
  const empty  = 10 - filled;
  return (
    <span style={{ color: scoreColor(score), fontVariantNumeric: 'tabular-nums' }}>
      {'['}{'█'.repeat(filled)}{'░'.repeat(empty)}{']'}
    </span>
  );
}

function DimLabel({ name }: { name: string }) {
  const padded = name.toUpperCase().replace(/\s+/g, '_').padEnd(20, '.');
  return (
    <span style={{ color: 'var(--t-muted)', letterSpacing: '0.04em' }}>{padded}</span>
  );
}

export default function EvaluationReport({ result }: Props) {
  const status   = result.overallScore >= 5 ? '[OK]' : '[WARN]';
  const tsLabel  = new Date(result.timestamp).toLocaleTimeString('en-US', { hour12: false });

  return (
    <div className="space-y-3">

      {/* ── Overall score pane ── */}
      <div className="t-pane">
        <div className="t-pane-title">
          {`ANALYSIS.COMPLETE ── ${status} ── via:${result.provider.toUpperCase()} ── ${tsLabel}`}
        </div>
        <div className="px-4 py-4 flex items-center gap-6">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--t-muted)', letterSpacing: '0.08em' }}>
              OVERALL_SCORE
            </p>
            <p
              className="text-5xl t-glow"
              style={{ color: scoreColor(result.overallScore), letterSpacing: '-0.02em' }}
            >
              {result.overallScore}
              <span className="text-lg" style={{ color: 'var(--t-muted)' }}>/10</span>
            </p>
          </div>

          {/* Mini bar chart */}
          <div className="flex-1 space-y-1 text-xs">
            {result.dimensions.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <DimLabel name={d.name} />
                <AsciiBar score={d.score} />
                <span style={{ color: scoreColor(d.score), minWidth: '2.5ch' }}>
                  {d.score.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dimension details ── */}
      <div className="t-pane">
        <div className="t-pane-title">DIMENSION.ANALYSIS</div>
        <div className="p-4 space-y-4">
          {result.dimensions.map((dim) => (
            <div key={dim.name} className="space-y-1">
              <div className="flex items-center gap-3 text-sm">
                <span
                  className="text-xs"
                  style={{
                    color: 'var(--t-bg)',
                    background: scoreColor(dim.score),
                    padding: '1px 6px',
                    letterSpacing: '0.1em',
                  }}
                >
                  {dim.name.toUpperCase().replace(/\s+/g, '_')}
                </span>
                <AsciiBar score={dim.score} />
                <span style={{ color: scoreColor(dim.score) }}>{dim.score.toFixed(1)}</span>
              </div>
              <p className="text-xs pl-2" style={{ color: 'var(--t-muted)' }}>
                {`// ${dim.feedback}`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Improvements + Edge cases ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="t-pane">
          <div className="t-pane-title">{`[OK] IMPROVEMENTS`}</div>
          <ul className="p-4 space-y-2">
            {result.improvements.map((item, i) => (
              <li key={i} className="text-xs flex gap-2">
                <span style={{ color: 'var(--t-fg)' }} className="shrink-0">{'>'}</span>
                <span style={{ color: 'var(--t-muted)' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="t-pane">
          <div className="t-pane-title amber">{`[WARN] EDGE_CASES`}</div>
          <ul className="p-4 space-y-2">
            {result.edgeCases.length > 0 ? (
              result.edgeCases.map((item, i) => (
                <li key={i} className="text-xs flex gap-2">
                  <span style={{ color: 'var(--t-amber)' }} className="shrink-0">!</span>
                  <span style={{ color: 'var(--t-muted)' }}>{item}</span>
                </li>
              ))
            ) : (
              <li className="text-xs" style={{ color: 'var(--t-muted)' }}>
                {`// no edge cases detected`}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
