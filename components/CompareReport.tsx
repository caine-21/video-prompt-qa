import type { CompareResult } from "@/lib/types";

interface Props {
  result: CompareResult;
}

function AsciiBar({ score }: { score: number }) {
  const filled = Math.round(score);
  const empty  = 10 - filled;
  const color  = score >= 8 ? 'var(--t-fg)' : score >= 5 ? 'var(--t-amber)' : 'var(--t-error)';
  return (
    <span style={{ color }}>
      {'['}{'█'.repeat(filled)}{'░'.repeat(empty)}{']'} {score.toFixed(1)}
    </span>
  );
}

export default function CompareReport({ result }: Props) {
  const { winner, scoreA, scoreB, reasoning, promptA, promptB, provider, timestamp } = result;
  const tsLabel = new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });

  const winnerLabel =
    winner === 'tie' ? 'TIE' : winner === 'A' ? 'PROMPT_A' : 'PROMPT_B';

  const winnerTitleColor = winner === 'tie' ? 'amber' : '';

  return (
    <div className="space-y-3">

      {/* ── Result banner ── */}
      <div className="t-pane">
        <div className={`t-pane-title ${winnerTitleColor}`}>
          {`COMPARISON.RESULT ── WINNER: ${winnerLabel} ── via:${provider.toUpperCase()} ── ${tsLabel}`}
        </div>
        <div className="px-4 py-4 flex items-center gap-8">
          <div className="text-xs space-y-1">
            <p style={{ color: 'var(--t-muted)', letterSpacing: '0.08em' }}>SCORE_A</p>
            <AsciiBar score={scoreA} />
          </div>
          <div
            className="text-lg"
            style={{
              color: 'var(--t-muted)',
              borderLeft: '1px solid var(--t-border)',
              borderRight: '1px solid var(--t-border)',
              padding: '0 16px',
            }}
          >
            VS
          </div>
          <div className="text-xs space-y-1">
            <p style={{ color: 'var(--t-muted)', letterSpacing: '0.08em' }}>SCORE_B</p>
            <AsciiBar score={scoreB} />
          </div>
          <div
            className="ml-auto text-2xl t-glow"
            style={{
              color: winner === 'tie' ? 'var(--t-amber)' : 'var(--t-fg)',
              letterSpacing: '0.1em',
            }}
          >
            {winner === 'tie' ? '== TIE ==' : `${winnerLabel} WINS`}
          </div>
        </div>
      </div>

      {/* ── Side by side prompts ── */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="t-pane"
          style={winner === 'A' ? { borderColor: 'var(--t-fg)' } : {}}
        >
          <div className="t-pane-title">
            {winner === 'A' ? `[WIN] PROMPT_A ── ${scoreA}/10` : `PROMPT_A ── ${scoreA}/10`}
          </div>
          <div className="p-3 space-y-2">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--t-muted)' }}>
              {promptA}
            </p>
          </div>
        </div>

        <div
          className="t-pane"
          style={winner === 'B' ? { borderColor: 'var(--t-amber)' } : {}}
        >
          <div className={`t-pane-title ${winner === 'B' ? 'amber' : ''}`}>
            {winner === 'B' ? `[WIN] PROMPT_B ── ${scoreB}/10` : `PROMPT_B ── ${scoreB}/10`}
          </div>
          <div className="p-3 space-y-2">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--t-muted)' }}>
              {promptB}
            </p>
          </div>
        </div>
      </div>

      {/* ── Reasoning ── */}
      <div className="t-pane">
        <div className="t-pane-title">REASONING.OUTPUT</div>
        <div className="p-4">
          <p className="text-xs leading-relaxed" style={{ color: 'var(--t-muted)' }}>
            {`> ${reasoning}`}
          </p>
        </div>
      </div>
    </div>
  );
}
