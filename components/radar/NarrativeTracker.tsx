'use client';

import { Narrative } from '@/lib/types';
import Tooltip from '@/components/ui/Tooltip';
import { Sparkles } from 'lucide-react';

interface Props { narratives: Narrative[]; }

const MOMENTUM_LABEL: Record<string, string> = { HIGH: 'surging', MED: 'building', LOW: 'cooling' };

export default function NarrativeTracker({ narratives }: Props) {
  const hasAI = narratives.some(n => n.aiGenerated);

  return (
    <div className="card">
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Trending Narratives</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {hasAI ? 'AI-detected cultural patterns' : 'Stories driving token demand'}
            </div>
          </div>
          <Tooltip text={hasAI
            ? 'Claude AI analyzes token names in one batch call, detecting cultural clusters, political narratives, language communities, and meta patterns that keyword matching misses.'
            : 'Narratives are keyword-detected. AI analysis loading…'}>
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold cursor-help flex items-center gap-1"
              style={{ background: 'var(--purple-soft)', color: 'var(--purple)', border: '1px solid rgba(179,136,255,0.2)' }}>
              {hasAI && <Sparkles size={10} strokeWidth={2.5} />}
              AI ⓘ
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2.5">
        {narratives.map((n, i) => (
          <div key={n.id} className="p-3 rounded-xl"
            style={{
              background: n.aiGenerated ? `${n.color}06` : 'rgba(255,255,255,0.025)',
              border: `1px solid ${n.aiGenerated ? n.color + '20' : 'var(--border)'}`,
            }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{n.label}</span>
                {n.aiGenerated && n.momentum && (
                  <span className="text-xs px-1.5 py-px rounded font-semibold"
                    style={{
                      background: `${n.color}18`, color: n.color,
                      border: `1px solid ${n.color}30`,
                    }}>
                    {MOMENTUM_LABEL[n.momentum] ?? n.momentum}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold" style={{ color: n.growth >= 0 ? 'var(--green)' : 'var(--pink)' }}>
                  {n.growth >= 0 ? '+' : ''}{n.growth}%
                </span>
                <span className="font-mono font-bold text-sm" style={{ color: n.color }}>{n.score}</span>
              </div>
            </div>

            <div className="signal-bar mb-2">
              <div className="signal-bar-fill" style={{ width: `${n.score}%`, background: `linear-gradient(90deg, ${n.color}60, ${n.color})` }} />
            </div>

            {/* AI insight */}
            {n.aiGenerated && n.insight && (
              <div className="text-xs mb-2 px-2 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', borderLeft: `2px solid ${n.color}50` }}>
                {n.insight}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 flex-wrap">
                {n.tokens.map((t, ti) => (
                  <span key={`${t}-${ti}`} className="font-mono text-xs px-1.5 py-px rounded font-bold"
                    style={{ background: `${n.color}14`, color: n.color, border: `1px solid ${n.color}25` }}>
                    ${t}
                  </span>
                ))}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {n.tokens.length} token{n.tokens.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-3">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {hasAI
            ? 'Patterns detected by Claude AI · Updated with each refresh'
            : 'AI pattern detection loading…'}
        </p>
      </div>
    </div>
  );
}
