'use client';

import { useState, useEffect, useRef } from 'react';
import { Token, CHAIN_META } from '@/lib/types';
import { AreaChart, Area, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import { Bell, ExternalLink, Flame, Zap, CheckCircle, Sparkles, Clock, Bot, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

function XIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.84L2.252 2.25h6.944l4.262 5.632 5.786-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}
import Tooltip from '@/components/ui/Tooltip';
import TokenAvatar from '@/components/ui/TokenAvatar';

interface AIVerdict {
  verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  thesis: string;
  suggestion: 'BUY' | 'WATCH' | 'AVOID';
}
const VERDICT_COLOR = { BULLISH: 'var(--green)', BEARISH: 'var(--pink)', NEUTRAL: 'var(--yellow)' };
const SUGGESTION_BG = { BUY: 'rgba(0,230,118,0.1)', WATCH: 'rgba(255,202,40,0.1)', AVOID: 'rgba(255,64,129,0.1)' };
const SUGGESTION_COLOR = { BUY: 'var(--green)', WATCH: 'var(--yellow)', AVOID: 'var(--pink)' };

interface Props { token: Token; onAlert: () => void; }

function fmtGradTime(mins: number): string {
  if (mins < 60) return `~${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

export default function FeaturedToken({ token, onAlert }: Props) {
  const sparkData = token.sparkline.map((v, i) => ({ t: i, v }));
  const priceUp = token.priceChange24h >= 0;
  const chain = CHAIN_META[token.chain];
  const buyPressure = token.buys1h + token.sells1h > 0
    ? Math.round((token.buys1h / (token.buys1h + token.sells1h)) * 100)
    : 50;

  const [verdict, setVerdict] = useState<AIVerdict | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const analyzedId = useRef<string>('');

  useEffect(() => {
    if (analyzedId.current === token.id) return;
    analyzedId.current = token.id;
    setVerdict(null);
    setAnalyzing(true);
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(token),
    })
      .then(r => r.text())
      .then(text => {
        // analyze route uses assistant prefill '{', so stream omits the opening brace
        const full = text.startsWith('{') ? text : '{' + text;
        const m = full.match(/\{[\s\S]*\}/);
        if (m) setVerdict(JSON.parse(m[0]));
      })
      .catch(() => {})
      .finally(() => setAnalyzing(false));
  }, [token.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const shareOnTwitter = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/token/${token.address}`;
    const text = `🔥 $${token.ticker} — Signal ${token.signal}/100 (${token.tier}) on MemeRadar\n\nClaude AI-powered scanner for @fourdotmemeZH · Real-time graduation predictor:`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=fourmeme,BNBChain`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="card animate-slide-up" style={{ border: `1px solid ${token.color}45` }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${token.color}, ${token.color}40, transparent)`, borderRadius: '14px 14px 0 0' }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <TokenAvatar color={token.color} imageUrl={token.imageUrl} name={token.name} ticker={token.ticker} size={56} />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-base)' }}>
              <span className="w-2.5 h-2.5 rounded-full animate-live"
                style={{ background: token.color, boxShadow: `0 0 8px ${token.color}` }} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{token.name}</h2>
              <span className="tier-fire px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1"><Flame size={10} strokeWidth={2.5} /> Top Signal</span>
              {token.aiScored && (
                <span className="px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1"
                  style={{ background: 'rgba(179,136,255,0.15)', color: 'var(--purple)', border: '1px solid rgba(179,136,255,0.3)' }}>
                  <Sparkles size={10} /> AI Scored
                </span>
              )}
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
          <div className="text-right shrink-0">
            <Tooltip text={token.aiScored ? 'AI signal — Claude scored on-chain momentum, buy pressure, bonding curve velocity, and age.' : 'Signal score — how hot this token is right now based on on-chain activity and momentum. 80+ = going viral.'}>
              <div className="cursor-help">
                <div className="font-mono font-bold" style={{ fontSize: 50, lineHeight: 1, color: token.color, textShadow: `0 0 40px ${token.color}55` }}>
                  {token.signal}
                </div>
                <div className="text-xs font-semibold mt-0.5 text-right flex items-center justify-end gap-1" style={{ color: 'var(--text-secondary)' }}>
                  {token.aiScored && <Sparkles size={10} style={{ color: '#a78bfa' }} />}
                  / 100 ⓘ
                </div>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Signal bar */}
        <div className="signal-bar mb-3" style={{ height: 7 }}>
          <div className="signal-bar-fill" style={{ width: `${token.signal}%`, background: `linear-gradient(90deg, ${token.color}55, ${token.color})` }} />
        </div>

        {/* Auto AI verdict */}
        {analyzing && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
            style={{ background: 'rgba(179,136,255,0.04)', border: '1px solid rgba(179,136,255,0.15)' }}>
            <Bot size={12} style={{ color: 'var(--purple)' }} />
            <span className="text-xs" style={{ color: 'var(--purple)' }}>Claude is analyzing this token…</span>
            <span className="animate-live ml-1" style={{ color: 'var(--purple)' }}>▌</span>
          </div>
        )}
        {verdict && !analyzing && (
          <div className="px-3 py-2.5 rounded-lg mb-3"
            style={{ background: 'rgba(179,136,255,0.05)', border: '1px solid rgba(179,136,255,0.2)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Bot size={12} style={{ color: 'var(--purple)' }} />
              <span className="font-bold text-xs" style={{ color: VERDICT_COLOR[verdict.verdict] }}>
                {verdict.verdict === 'BULLISH' ? '▲' : verdict.verdict === 'BEARISH' ? '▼' : '—'} {verdict.verdict}
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{verdict.confidence}% conf.</span>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: SUGGESTION_BG[verdict.suggestion], color: SUGGESTION_COLOR[verdict.suggestion] }}>
                {verdict.suggestion}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{verdict.thesis}</p>
          </div>
        )}

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
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--yellow)' }}>
                <Zap size={11} strokeWidth={2.5} /> Almost graduated — PancakeSwap listing imminent!
              </p>
            )}
            {token.timeToGradMinutes && token.bondingCurveProgress < 80 && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#f0b90b' }}>
                <Clock size={11} strokeWidth={2} /> At current velocity: {fmtGradTime(token.timeToGradMinutes)} to graduation
              </p>
            )}
            {token.timeToGradMinutes && token.bondingCurveProgress >= 80 && (
              <p className="text-xs mt-0.5 flex items-center gap-1 font-bold" style={{ color: 'var(--green)' }}>
                <Clock size={11} strokeWidth={2.5} /> ETA: {fmtGradTime(token.timeToGradMinutes)} to PancakeSwap listing
              </p>
            )}
          </div>
        )}
        {token.listedOnDex && (
          <div className="mb-3 flex items-center gap-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
              style={{ background: 'rgba(0,230,118,0.1)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.2)' }}>
              <CheckCircle size={11} strokeWidth={2.5} /> Listed on {token.chain === 'bsc' ? 'PancakeSwap' : 'DEX'}
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

        {/* Rug risk inline */}
        {token.rugRisk && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-3"
            style={{
              background: token.rugRisk.level === 'SAFE' ? 'rgba(0,230,118,0.04)' : token.rugRisk.level === 'DANGER' ? 'rgba(255,64,129,0.06)' : 'rgba(255,202,40,0.05)',
              border: `1px solid ${token.rugRisk.level === 'SAFE' ? 'rgba(0,230,118,0.2)' : token.rugRisk.level === 'DANGER' ? 'rgba(255,64,129,0.25)' : 'rgba(255,202,40,0.2)'}`,
            }}>
            <div className="flex items-center gap-2">
              {token.rugRisk.level === 'SAFE'
                ? <ShieldCheck size={12} style={{ color: 'var(--green)' }} />
                : token.rugRisk.level === 'DANGER'
                ? <ShieldX size={12} style={{ color: 'var(--pink)' }} />
                : <ShieldAlert size={12} style={{ color: 'var(--yellow)' }} />}
              <span className="text-xs font-bold" style={{
                color: token.rugRisk.level === 'SAFE' ? 'var(--green)' : token.rugRisk.level === 'DANGER' ? 'var(--pink)' : 'var(--yellow)',
              }}>
                Rug Risk: {token.rugRisk.level}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{token.rugRisk.summary}</span>
            </div>
            <span className="font-mono text-xs font-bold" style={{
              color: token.rugRisk.level === 'SAFE' ? 'var(--green)' : token.rugRisk.level === 'DANGER' ? 'var(--pink)' : 'var(--yellow)',
            }}>{token.rugRisk.score}/100</span>
          </div>
        )}

        {/* Smart money alert */}
        {token.smartMoneyActive && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3"
            style={{ background: 'rgba(179,136,255,0.06)', border: '1px solid rgba(179,136,255,0.2)' }}>
            <span style={{ fontSize: 14 }}>🐋</span>
            <span className="text-xs font-bold" style={{ color: 'var(--purple)' }}>Smart Money Active</span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Whale wallets buying across multiple FIRE tokens are in this one.</span>
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1 flex items-center justify-center gap-2" onClick={e => { e.stopPropagation(); onAlert(); }}>
            <Bell size={14} /> Set Alert
          </button>
          <button className="btn btn-ghost flex items-center gap-1.5" style={{ fontSize: 13 }} onClick={shareOnTwitter}>
            <XIcon size={13} /> Share
          </button>
          <a href={token.fourMemeUrl} target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost flex items-center gap-1.5" style={{ fontSize: 13 }}
            onClick={e => e.stopPropagation()}>
            {token.chain === 'bsc' ? 'Four.meme' : 'DexScreener'} <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
