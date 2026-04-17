'use client';

import { Narrative } from '@/lib/types';
import Tooltip from '@/components/ui/Tooltip';

interface Props { narratives: Narrative[]; }

export default function NarrativeTracker({ narratives }: Props) {
  return (
    <div className="card">
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Trending Narratives</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Stories driving token demand
            </div>
          </div>
          <Tooltip text="Narratives are the cultural stories that make meme tokens go viral. The stronger the narrative, the more money flows in.">
            <span className="text-xs px-2 py-0.5 rounded-md font-semibold cursor-help"
              style={{ background: 'var(--purple-soft)', color: 'var(--purple)', border: '1px solid rgba(179,136,255,0.2)' }}>
              AI ⓘ
            </span>
          </Tooltip>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2.5">
        {narratives.map((n, i) => (
          <div key={n.id} className="p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)', transition: 'border-color .15s' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{n.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold" style={{ color: n.growth >= 0 ? 'var(--green)' : 'var(--pink)' }}>
                  {n.growth >= 0 ? '+' : ''}{n.growth}%
                </span>
                <span className="font-mono font-bold text-sm" style={{ color: n.color }}>{n.score}</span>
              </div>
            </div>

            <div className="signal-bar mb-2.5">
              <div className="signal-bar-fill" style={{ width: `${n.score}%`, background: `linear-gradient(90deg, ${n.color}60, ${n.color})` }} />
            </div>

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
          Narratives are detected automatically by AI pattern analysis across social platforms.
        </p>
      </div>
    </div>
  );
}
