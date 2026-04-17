'use client';

import { Token, CHAIN_META } from '@/lib/types';
import { AreaChart, Area, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import Tooltip from '@/components/ui/Tooltip';
import TokenAvatar from '@/components/ui/TokenAvatar';

interface Props { token: Token; onAlert: () => void; }

export default function FeaturedToken({ token, onAlert }: Props) {
  const sparkData = token.sparkline.map((v, i) => ({ t: i, v }));
  const priceUp = token.priceChange24h >= 0;
  const chain = CHAIN_META[token.chain];
  const buyPressure = token.buys1h + token.sells1h > 0
    ? Math.round((token.buys1h / (token.buys1h + token.sells1h)) * 100)
    : 50;

  return (
    <div className="card animate-slide-up" style={{ border: `1px solid ${token.color}45` }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${token.color}, ${token.color}40, transparent)`, borderRadius: '14px 14px 0 0' }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <TokenAvatar emoji={token.emoji} color={token.color} imageUrl={token.imageUrl} name={token.name} size={56} />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-base)' }}>
              <span className="w-2.5 h-2.5 rounded-full animate-live"
                style={{ background: token.color, boxShadow: `0 0 8px ${token.color}` }} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{token.name}</h2>
              <span className="tier-fire px-2 py-0.5 rounded-md text-xs font-bold">🔥 Top Signal</span>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
                style={{ background: `${chain.color}18`, color: chain.color, border: `1px solid ${chain.color}30` }}>
                {chain.icon} {chain.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm" style={{ color: token.color }}>${token.ticker}</span>
              {parseFloat(token.priceUsd) > 0 && (
                <span className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  ${parseFloat(token.priceUsd) < 0.000001
                    ? parseFloat(token.priceUsd).toExponential(2)
                    : parseFloat(token.priceUsd) < 0.01
                    ? parseFloat(token.priceUsd).toFixed(7)
                    : parseFloat(token.priceUsd).toFixed(4)}
                </span>
              )}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Listed {token.age} ago · {token.buys24h + token.sells24h} txns today
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <Tooltip text="Signal score — how hot this token is right now based on on-chain activity and momentum. 80+ = going viral.">
              <div className="cursor-help">
                <div className="font-mono font-bold" style={{ fontSize: 50, lineHeight: 1, color: token.color, textShadow: `0 0 40px ${token.color}55` }}>
                  {token.signal}
                </div>
                <div className="text-xs font-semibold mt-0.5 text-right" style={{ color: 'var(--text-secondary)' }}>/ 100 ⓘ</div>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Signal bar */}
        <div className="signal-bar mb-1" style={{ height: 7 }}>
          <div className="signal-bar-fill" style={{ width: `${token.signal}%`, background: `linear-gradient(90deg, ${token.color}55, ${token.color})` }} />
        </div>

        {/* Bonding curve (Four.meme only) */}
        {!token.listedOnDex && (
          <div className="mb-3 mt-2">
            <div className="flex items-center justify-between mb-1">
              <Tooltip text="How close this token is to graduating from the Four.meme bonding curve and listing on PancakeSwap. At 100%, it goes live on DEX.">
                <span className="text-xs font-semibold cursor-help" style={{ color: 'var(--text-secondary)' }}>
                  Bonding curve progress ⓘ
                </span>
              </Tooltip>
              <span className="font-mono text-xs font-bold" style={{ color: token.bondingCurveProgress >= 80 ? 'var(--green)' : 'var(--yellow)' }}>
                {token.bondingCurveProgress}%
              </span>
            </div>
            <div className="signal-bar">
              <div className="signal-bar-fill" style={{
                width: `${token.bondingCurveProgress}%`,
                background: `linear-gradient(90deg, #f0b90b80, #f0b90b)`,
              }} />
            </div>
            {token.bondingCurveProgress >= 80 && (
              <p className="text-xs mt-1" style={{ color: 'var(--yellow)' }}>
                ⚡ Almost graduated — PancakeSwap listing imminent!
              </p>
            )}
          </div>
        )}
        {token.listedOnDex && (
          <div className="mb-3 flex items-center gap-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(0,230,118,0.1)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.2)' }}>
              ✓ Listed on {token.chain === 'bsc' ? 'PancakeSwap' : 'DEX'}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Buys 1h', tip: 'Number of buy transactions in the last hour.', value: token.buys1h.toString(), color: 'var(--green)' },
            { label: 'Price 24h', tip: 'Price change over the last 24 hours.', value: `${priceUp?'+':''}${token.priceChange24h.toFixed(1)}%`, color: priceUp ? 'var(--green)' : 'var(--pink)' },
            { label: 'Mcap', tip: 'Estimated market capitalisation.', value: token.marketCap },
            { label: 'Buy press.', tip: 'What percentage of the last hour\'s transactions were buys. Above 60% = strong demand.', value: `${buyPressure}%`, color: buyPressure > 60 ? 'var(--green)' : buyPressure < 40 ? 'var(--pink)' : 'var(--yellow)' },
          ].map(s => (
            <Tooltip key={s.label} text={s.tip}>
              <div className="w-full rounded-xl p-2.5 cursor-help" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
                <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{s.label} ⓘ</div>
                <div className="font-bold font-mono text-sm" style={{ color: (s as any).color || 'var(--text-primary)' }}>
                  {s.value}
                </div>
              </div>
            </Tooltip>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-xl overflow-hidden mb-3" style={{ height: 72, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
          <ResponsiveContainer width="100%" height={72}>
            <AreaChart data={sparkData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`feat-${token.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={token.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={token.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={token.color} strokeWidth={2}
                fill={`url(#feat-${token.id})`} dot={false} isAnimationActive={false} />
              <ReTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [v, 'Signal']} labelFormatter={() => ''} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Narratives */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {token.narratives.map(n => (
            <span key={n} className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: `${token.color}12`, color: token.color, border: `1px solid ${token.color}28` }}>
              {n}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" onClick={e => { e.stopPropagation(); onAlert(); }}>
            🔔 Set Alert
          </button>
          <a
            href={token.fourMemeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost flex items-center gap-1.5"
            style={{ fontSize: 13 }}
            onClick={e => e.stopPropagation()}
          >
            {token.chain === 'bsc' ? '🟡 Four.meme' : '📊 DexScreener'} ↗
          </a>
        </div>
      </div>
    </div>
  );
}
