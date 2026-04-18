'use client';

import { Token } from '@/lib/types';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Flame, Zap, Thermometer, Snowflake, Bell, Sparkles, Clock, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import TokenAvatar from '@/components/ui/TokenAvatar';

interface Props {
  token: Token;
  selected: boolean;
  onClick: () => void;
  onAlert?: () => void;
}

const TIER_ICON: Record<string, React.ElementType> = {
  FIRE: Flame, HOT: Zap, WARM: Thermometer, COLD: Snowflake,
};
const TIER_LABEL: Record<string, string> = {
  FIRE: 'On Fire', HOT: 'Hot', WARM: 'Warm', COLD: 'Cooling',
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

function fmtGradTime(mins: number): string {
  if (mins < 60) return `~${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
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
              <TokenAvatar color={token.color} imageUrl={token.imageUrl} name={token.name} ticker={token.ticker} size={36} />
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
            {(() => { const Icon = TIER_ICON[token.tier]; return (
              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1 ${TIER_CLASS[token.tier]}`}>
                <Icon size={10} strokeWidth={2.5} />
                {TIER_LABEL[token.tier]}
              </span>
            ); })()}
            {(Date.now() - token.createdAt) < 7_200_000 && (
              <span className="text-xs px-1.5 py-px rounded font-bold animate-pop-in"
                style={{ background: 'rgba(255,202,40,0.15)', color: 'var(--yellow)', border: '1px solid rgba(255,202,40,0.3)' }}>
                NEW
              </span>
            )}
            {!token.listedOnDex && token.bondingCurveProgress >= 80 && (
              <span className="text-xs px-1.5 py-px rounded font-bold animate-pop-in flex items-center gap-1"
                style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.3)' }}>
                <Clock size={9} strokeWidth={2.5} />
                {token.timeToGradMinutes ? fmtGradTime(token.timeToGradMinutes) : 'GRAD'}
              </span>
            )}
          </div>
        </div>

        {/* Signal */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <Tooltip text={token.aiScored ? 'AI signal score — Claude analyzed on-chain momentum, buy pressure, bonding curve, and age to rate this token 0–100.' : 'Signal score (0–100). Above 80 is going viral. Below 40 is cooling down.'}>
              <span className="text-xs font-semibold cursor-help flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                {token.aiScored && <Sparkles size={10} style={{ color: '#a78bfa' }} />}
                Signal ⓘ
              </span>
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
          <Tooltip text="On-chain buy transactions in the last hour. The arrow shows acceleration vs. the 24h average.">
            <div className="w-full rounded-lg p-2.5 cursor-help" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Buys/hr ⓘ</div>
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
          <div className="flex gap-1 flex-wrap items-center">
            {token.rugRisk && (
              <Tooltip text={`Rug risk: ${token.rugRisk.level} (${token.rugRisk.score}/100) — ${token.rugRisk.summary}`}>
                <span className="flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded cursor-help"
                  style={{
                    background: token.rugRisk.level === 'SAFE' ? 'rgba(0,230,118,0.1)' : token.rugRisk.level === 'DANGER' ? 'rgba(255,64,129,0.12)' : 'rgba(255,202,40,0.1)',
                    color: token.rugRisk.level === 'SAFE' ? 'var(--green)' : token.rugRisk.level === 'DANGER' ? 'var(--pink)' : 'var(--yellow)',
                    border: `1px solid ${token.rugRisk.level === 'SAFE' ? 'rgba(0,230,118,0.25)' : token.rugRisk.level === 'DANGER' ? 'rgba(255,64,129,0.25)' : 'rgba(255,202,40,0.25)'}`,
                  }}>
                  {token.rugRisk.level === 'SAFE' ? <ShieldCheck size={9} /> : token.rugRisk.level === 'DANGER' ? <ShieldX size={9} /> : <ShieldAlert size={9} />}
                  {token.rugRisk.score}
                </span>
              </Tooltip>
            )}
            {token.smartMoneyActive && (
              <Tooltip text="Smart money detected — wallets that profited on multiple FIRE tokens are buying this one.">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded cursor-help"
                  style={{ background: 'rgba(179,136,255,0.12)', color: 'var(--purple)', border: '1px solid rgba(179,136,255,0.3)' }}>
                  🐋 Whale
                </span>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip text={`Risk: ${RISK_LABEL[token.risk]}. ${token.risk === 'LOW' ? 'Established.' : token.risk === 'MED' ? 'Growing fast.' : token.risk === 'HIGH' ? 'Hype-driven.' : 'Very new, very risky.'}`}>
              <span className="text-xs font-semibold cursor-help" style={{ color: RISK_COLOR[token.risk] }}>
                {RISK_LABEL[token.risk]} ⓘ
              </span>
            </Tooltip>
            {onAlert && (
              <button
                className="p-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); onAlert(); }}
                title="Set alert"
              >
                <Bell size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
