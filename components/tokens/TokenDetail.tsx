'use client';

import { useState } from 'react';
import { Token } from '@/lib/types';
import { AreaChart, Area, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import Tooltip from '@/components/ui/Tooltip';
import TokenAvatar from '@/components/ui/TokenAvatar';

interface Props {
  token: Token;
  onClose: () => void;
  onAlert: () => void;
}

const RISK_COLOR: Record<string, string> = {
  LOW: 'var(--green)', MED: 'var(--yellow)', HIGH: 'var(--pink)', DEGEN: 'var(--purple)',
};
const RISK_DESC: Record<string, string> = {
  LOW: 'Established community, relatively lower risk.',
  MED: 'Growing fast — moderate risk.',
  HIGH: 'Hype-driven. Proceed carefully.',
  DEGEN: 'Extremely new. Very high risk.',
};

export default function TokenDetail({ token, onClose, onAlert }: Props) {
  const sparkData = token.sparkline.map((v, i) => ({ t: i, v }));
  const priceUp = token.priceChange24h >= 0;
  const signalUp = token.signalDelta >= 0;
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(token.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="card animate-slide-up" style={{ border: `1px solid ${token.color}40` }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${token.color}, ${token.color}40, transparent)`, borderRadius: '14px 14px 0 0' }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <TokenAvatar emoji={token.emoji} color={token.color} imageUrl={token.imageUrl} name={token.name} size={44} />
            <div>
              <div className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{token.name}</div>
              <div className="font-mono text-xs" style={{ color: token.color }}>${token.ticker}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Listed {token.age} ago</span>
                {token.address && (
                  <button onClick={copyAddress}
                    className="font-mono text-xs px-1.5 py-px rounded flex items-center gap-1"
                    style={{ background: copied ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.04)', color: copied ? 'var(--green)' : 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
                    title="Copy contract address">
                    {copied ? '✓' : '⎘'} {copied ? 'Copied!' : token.address.slice(0, 6) + '…' + token.address.slice(-4)}
                  </button>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', border: '1px solid var(--border)', fontSize: 14 }}>
            ✕
          </button>
        </div>

        {/* Big score */}
        <div className="flex items-end justify-between p-4 rounded-xl mb-4"
          style={{ background: `${token.color}08`, border: `1px solid ${token.color}20` }}>
          <Tooltip text="Signal score — how much social buzz this token has right now. 80+ = going viral.">
            <div className="cursor-help">
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Signal score ⓘ</div>
              <div className="font-bold font-mono" style={{ fontSize: 44, lineHeight: 1, color: token.color }}>
                {token.signal}
              </div>
              <div className="font-mono text-xs mt-1" style={{ color: signalUp ? 'var(--green)' : 'var(--pink)' }}>
                {signalUp ? '▲ +'  : '▼ '}{token.signalDelta} this hour
              </div>
            </div>
          </Tooltip>
          <div className="text-right">
            <div className="font-bold text-xl" style={{ color: priceUp ? 'var(--green)' : 'var(--pink)' }}>
              {priceUp ? '+' : ''}{token.priceChange24h}%
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>24h price change</div>
          </div>
        </div>

        {/* Signal bar */}
        <div className="signal-bar mb-4" style={{ height: 6 }}>
          <div className="signal-bar-fill" style={{ width: `${token.signal}%`, background: `linear-gradient(90deg, ${token.color}60, ${token.color})` }} />
        </div>

        {/* Chart */}
        <div className="rounded-xl overflow-hidden mb-4" style={{ height: 72, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`td-${token.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={token.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={token.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={token.color} strokeWidth={2} fill={`url(#td-${token.id})`} dot={false} />
              <ReTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} formatter={(v) => [v, 'Signal']} labelFormatter={() => ''} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: 'Price USD', tip: 'Current token price in USD.', value: parseFloat(token.priceUsd) > 0 ? `$${parseFloat(token.priceUsd) < 0.000001 ? parseFloat(token.priceUsd).toExponential(2) : parseFloat(token.priceUsd) < 0.01 ? parseFloat(token.priceUsd).toFixed(7) : parseFloat(token.priceUsd).toFixed(4)}` : 'N/A' },
            { label: 'Market cap', tip: 'Estimated total market value.', value: token.marketCap },
            { label: 'Buys 1h', tip: 'Number of buy transactions in the last hour.', value: `${token.buys1h}`, vColor: 'var(--green)' },
            { label: 'Risk level', tip: RISK_DESC[token.risk], value: token.risk, vColor: RISK_COLOR[token.risk] },
          ].map(s => (
            <Tooltip key={s.label} text={s.tip}>
              <div className="w-full rounded-xl p-2.5 cursor-help" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
                <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{s.label} ⓘ</div>
                <div className="font-bold font-mono text-xs" style={{ color: (s as any).vColor || 'var(--text-primary)' }}>{s.value}</div>
              </div>
            </Tooltip>
          ))}
        </div>

        {/* Narratives */}
        <div className="mb-4">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
            Why it's trending
          </div>
          <div className="flex flex-wrap gap-1.5">
            {token.narratives.map(n => (
              <span key={n} className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: `${token.color}12`, color: token.color, border: `1px solid ${token.color}28` }}>
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-2 mb-2">
          <button className="btn btn-primary flex-1" onClick={onAlert}>
            🔔 Set Alert
          </button>
          <a href={token.fourMemeUrl} target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost flex items-center gap-1" style={{ fontSize: 12 }}
            onClick={e => e.stopPropagation()}>
            {token.chain === 'bsc' ? '🟡 Four.meme' : '📊 Chart'} ↗
          </a>
        </div>

        {/* Social links */}
        {(token.twitterUrl || token.telegramUrl || token.websiteUrl) && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {token.twitterUrl && (
              <a href={token.twitterUrl} target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost text-xs py-1 px-2.5 flex items-center gap-1"
                onClick={e => e.stopPropagation()}>
                𝕏 Twitter
              </a>
            )}
            {token.telegramUrl && (
              <a href={token.telegramUrl} target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost text-xs py-1 px-2.5 flex items-center gap-1"
                onClick={e => e.stopPropagation()}>
                ✈ Telegram
              </a>
            )}
            {token.websiteUrl && (
              <a href={token.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost text-xs py-1 px-2.5 flex items-center gap-1"
                onClick={e => e.stopPropagation()}>
                🌐 Website
              </a>
            )}
          </div>
        )}

        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          Alerts are saved in your browser — no account needed
        </p>
      </div>
    </div>
  );
}
