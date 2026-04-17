'use client';

import { Token } from '@/lib/types';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import Tooltip from '@/components/ui/Tooltip';
import TokenAvatar from '@/components/ui/TokenAvatar';

interface Props {
  token: Token;
  selected: boolean;
  onClick: () => void;
  onAlert?: () => void;
}

const TIER_LABEL: Record<string, string> = {
  FIRE: '🔥 On Fire', HOT: '⚡ Hot', WARM: '🌡 Warm', COLD: '❄️ Cooling',
};
const TIER_CLASS: Record<string, string> = {
  FIRE: 'tier-fire', HOT: 'tier-hot', WARM: 'tier-warm', COLD: 'tier-cold',
};
const RISK_COLOR: Record<string, string> = {
  LOW: 'var(--green)', MED: 'var(--yellow)', HIGH: 'var(--pink)', DEGEN: 'var(--purple)',
};
const RISK_LABEL: Record<string, string> = {
  LOW: 'Low risk', MED: 'Med risk', HIGH: 'High risk', DEGEN: 'Degen',
};

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function SignalCard({ token, selected, onClick, onAlert }: Props) {
  const up = token.signalDelta >= 0;
  const priceUp = token.priceChange24h >= 0;
  const sparkData = token.sparkline.map((v, i) => ({ v, i }));

  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        border: selected ? `1px solid ${token.color}60` : '1px solid var(--border)',
        boxShadow: selected ? `0 0 0 1px ${token.color}20, 0 8px 32px ${token.color}12` : undefined,
        transition: 'all .2s ease',
        cursor: 'pointer',
        transform: selected ? 'translateY(-2px)' : undefined,
      }}
    >
      {/* Accent line */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${token.color}, ${token.color}30)`, borderRadius: '14px 14px 0 0' }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <TokenAvatar emoji={token.emoji} color={token.color} imageUrl={token.imageUrl} name={token.name} size={36} />
              {token.tier === 'FIRE' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-live"
                  style={{ background: token.color, boxShadow: `0 0 6px ${token.color}` }} />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{token.name}</div>
              <div className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>${token.ticker} · {token.age}</div>
              {parseFloat(token.priceUsd) > 0 && (
                <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  ${parseFloat(token.priceUsd) < 0.000001
                    ? parseFloat(token.priceUsd).toExponential(2)
                    : parseFloat(token.priceUsd) < 0.01
                    ? parseFloat(token.priceUsd).toFixed(7)
                    : parseFloat(token.priceUsd).toFixed(4)
                  }
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-1">
            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${TIER_CLASS[token.tier]}`}>
              {TIER_LABEL[token.tier]}
            </span>
            {(Date.now() - token.createdAt) < 7_200_000 && (
              <span className="text-xs px-1.5 py-px rounded font-bold animate-pop-in"
                style={{ background: 'rgba(255,202,40,0.15)', color: 'var(--yellow)', border: '1px solid rgba(255,202,40,0.3)' }}>
                NEW
              </span>
            )}
          </div>
        </div>

        {/* Signal */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <Tooltip text="Signal score (0–100). Above 80 is going viral. Below 40 is cooling down.">
              <span className="text-xs font-semibold cursor-help" style={{ color: 'var(--text-secondary)' }}>Signal ⓘ</span>
            </Tooltip>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-base" style={{ color: token.color }}>{token.signal}</span>
              <span className="font-mono text-xs px-1 rounded"
                style={{ color: up ? 'var(--green)' : 'var(--pink)', background: up ? 'var(--green-soft)' : 'var(--pink-soft)' }}>
                {up ? '▲' : '▼'}{Math.abs(token.signalDelta)}
              </span>
            </div>
          </div>
          <div className="signal-bar">
            <div className="signal-bar-fill" style={{ width: `${token.signal}%`, background: `linear-gradient(90deg, ${token.color}60, ${token.color})` }} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Tooltip text="How many times this token is mentioned per hour across all social platforms.">
            <div className="w-full rounded-lg p-2.5 cursor-help" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Mentions/hr ⓘ</div>
              <div className="font-bold font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                {fmt(token.socialVelocity)}
                <span className="text-xs font-normal ml-1" style={{ color: token.velocityDelta >= 0 ? 'var(--green)' : 'var(--pink)' }}>
                  {token.velocityDelta >= 0 ? '↑' : '↓'}
                </span>
              </div>
            </div>
          </Tooltip>
          <Tooltip text="Price change over the last 24 hours.">
            <div className="w-full rounded-lg p-2.5 cursor-help" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>24h price ⓘ</div>
              <div className="font-bold font-mono text-sm" style={{ color: priceUp ? 'var(--green)' : 'var(--pink)' }}>
                {priceUp ? '+' : ''}{token.priceChange24h}%
              </div>
            </div>
          </Tooltip>
        </div>

        {/* Sparkline — give explicit height to avoid Recharts warning */}
        <div style={{ height: 34, marginBottom: 12 }}>
          <ResponsiveContainer width="100%" height={34}>
            <LineChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <Line type="monotone" dataKey="v" stroke={token.color} strokeWidth={1.5} dot={false} strokeOpacity={0.85} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {token.platforms.map(p => (
              <span key={p} className="font-mono text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>{p}</span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip text={`Risk: ${RISK_LABEL[token.risk]}. ${token.risk === 'LOW' ? 'Established.' : token.risk === 'MED' ? 'Growing fast.' : token.risk === 'HIGH' ? 'Hype-driven.' : 'Very new, very risky.'}`}>
              <span className="text-xs font-semibold cursor-help" style={{ color: RISK_COLOR[token.risk] }}>
                {RISK_LABEL[token.risk]} ⓘ
              </span>
            </Tooltip>
            {onAlert && (
              <button
                className="font-mono text-xs px-2 py-0.5 rounded transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); onAlert(); }}
                title="Set alert"
              >
                🔔
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
