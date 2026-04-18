'use client';

import { useState, useEffect } from 'react';
import { Token } from '@/lib/types';
import { AreaChart, Area, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import { X, Bell, ExternalLink, Send, Globe, Copy, Check, Bot, Zap, AlertTriangle, User, Droplets, Share2, Clock, TrendingUp, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

function XIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.84L2.252 2.25h6.944l4.262 5.632 5.786-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}
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

interface AIAnalysis {
  verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  thesis: string;
  catalyst: string;
  risk: string;
  suggestion: 'BUY' | 'WATCH' | 'AVOID';
  suggestedSizeUsd: number;
}

function fmtGradTime(mins: number): string {
  if (mins < 60) return `~${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

const VERDICT_COLOR = { BULLISH: 'var(--green)', BEARISH: 'var(--pink)', NEUTRAL: 'var(--yellow)' };
const SUGGESTION_COLOR = { BUY: 'var(--green)', WATCH: 'var(--yellow)', AVOID: 'var(--pink)' };
const SUGGESTION_BG = { BUY: 'rgba(0,230,118,0.1)', WATCH: 'rgba(255,202,40,0.1)', AVOID: 'rgba(255,64,129,0.1)' };

export default function TokenDetail({ token, onClose, onAlert }: Props) {
  const sparkData = token.sparkline.map((v, i) => ({ t: i, v }));
  const priceUp = token.priceChange24h >= 0;
  const signalUp = token.signalDelta >= 0;
  const [copied, setCopied] = useState(false);

  // AI analysis state
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [aiRaw, setAiRaw] = useState('');
  const [aiResult, setAiResult] = useState<AIAnalysis | null>(null);

  const [sharedLink, setSharedLink] = useState(false);

  // Creator track record
  const [creatorStats, setCreatorStats] = useState<{ total: number; graduated: number; avgDay1Pct: number | null } | null>(null);
  useEffect(() => {
    if (!token.creatorAddress) return;
    setCreatorStats(null);
    fetch(`/api/creator?address=${token.creatorAddress}`)
      .then(r => r.json())
      .then(d => { if (d.total > 0) setCreatorStats(d); })
      .catch(() => {});
  }, [token.creatorAddress]);

  const copyAddress = () => {
    navigator.clipboard.writeText(token.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareOnTwitter = () => {
    const url = `${window.location.origin}/token/${token.address}`;
    const verdict = token.rugRisk?.level === 'DANGER' ? '⚠️ HIGH RUG RISK' : token.tier === 'FIRE' ? '🔥 FIRE signal' : '📡 HOT signal';
    const text = `${verdict} — $${token.ticker} · Signal ${token.signal}/100 on MemeRadar\n\nAI-powered scanner for @fourdotmemeZH tokens. Check the real-time signal:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=fourmeme,BNBChain`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    setSharedLink(true);
    setTimeout(() => setSharedLink(false), 2000);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/token/${token.address}`;
    navigator.clipboard.writeText(url).then(() => {
      setSharedLink(true);
      setTimeout(() => setSharedLink(false), 2000);
    });
  };

  const runAnalysis = async () => {
    setAiState('loading');
    setAiRaw('');
    setAiResult(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(token),
      });
      if (!res.ok) throw new Error('API error');
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      // We prefilled '{' in the assistant turn, so prepend it
      let full = '{';
      setAiRaw(full);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setAiRaw(full);
      }
      const jsonMatch = full.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setAiResult(JSON.parse(jsonMatch[0]));
      }
      setAiState('done');
    } catch {
      setAiState('error');
    }
  };

  return (
    <div className="card animate-slide-up" style={{ border: `1px solid ${token.color}40` }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${token.color}, ${token.color}40, transparent)`, borderRadius: '14px 14px 0 0' }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <TokenAvatar color={token.color} imageUrl={token.imageUrl} name={token.name} ticker={token.ticker} size={44} />
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
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? 'Copied!' : token.address.slice(0, 6) + '…' + token.address.slice(-4)}
                  </button>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', border: '1px solid var(--border)' }}>
            <X size={13} />
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

        {/* Four.meme specific data */}
        {token.chain === 'bsc' && (token.creatorAddress || token.bondingCurveBnb !== undefined) && (
          <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(240,185,11,0.05)', border: '1px solid rgba(240,185,11,0.2)' }}>
            <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#f0b90b' }}>
              <img src="https://four.meme/favicon.ico" alt="" width={12} height={12} style={{ borderRadius: 2 }} onError={e => (e.currentTarget.style.display = 'none')} />
              Four.meme Data
            </div>
            {token.creatorAddress && (
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <User size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Creator:</span>
                  <a
                    href={`https://bscscan.com/address/${token.creatorAddress}`}
                    target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs"
                    style={{ color: 'var(--blue)', textDecoration: 'none' }}
                    onClick={e => e.stopPropagation()}>
                    {token.creatorAddress.slice(0, 6)}…{token.creatorAddress.slice(-4)}
                  </a>
                </div>
                {creatorStats && (
                  <div className="flex items-center gap-2 mt-1.5 px-2 py-1.5 rounded-lg flex-wrap"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <TrendingUp size={10} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Track record:</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {creatorStats.total} token{creatorStats.total !== 1 ? 's' : ''} launched
                    </span>
                    <span className="text-xs px-1.5 py-px rounded font-bold"
                      style={{ background: 'rgba(0,230,118,0.1)', color: 'var(--green)' }}>
                      {creatorStats.graduated}/{creatorStats.total} graduated
                    </span>
                    {creatorStats.avgDay1Pct !== null && (
                      <span className="text-xs px-1.5 py-px rounded font-bold"
                        style={{
                          background: creatorStats.avgDay1Pct >= 0 ? 'rgba(0,230,118,0.1)' : 'rgba(255,64,129,0.1)',
                          color: creatorStats.avgDay1Pct >= 0 ? 'var(--green)' : 'var(--pink)',
                        }}>
                        avg {creatorStats.avgDay1Pct >= 0 ? '+' : ''}{creatorStats.avgDay1Pct}% day 1
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            {!token.listedOnDex && token.bondingCurveBnb !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    <Droplets size={11} /> BNB raised
                  </span>
                  <span className="font-mono text-xs font-bold" style={{ color: token.bondingCurveProgress >= 80 ? 'var(--green)' : '#f0b90b' }}>
                    {token.bondingCurveBnb.toFixed(2)} / 24 BNB
                  </span>
                </div>
                <div className="signal-bar" style={{ height: 5 }}>
                  <div className="signal-bar-fill" style={{
                    width: `${Math.min(100, token.bondingCurveProgress)}%`,
                    background: token.bondingCurveProgress >= 80
                      ? 'linear-gradient(90deg, #00e67680, #00e676)'
                      : 'linear-gradient(90deg, #f0b90b80, #f0b90b)',
                  }} />
                </div>
                {token.bondingCurveProgress >= 80 && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--green)' }}>
                    <Zap size={10} strokeWidth={2.5} /> {token.bondingCurveProgress}% — PancakeSwap listing imminent!
                  </p>
                )}
              </div>
            )}
            {token.listedOnDex && (
              <div className="flex items-center gap-1.5">
                <Check size={11} style={{ color: 'var(--green)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--green)' }}>
                  Graduated — listed on PancakeSwap
                </span>
              </div>
            )}
            {token.fourMemeStatus && (
              <div className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                Status: <span className="font-mono font-bold" style={{ color: token.fourMemeStatus === 'TRADE' ? 'var(--green)' : '#f0b90b' }}>{token.fourMemeStatus}</span>
                {token.fourMemeTag && <span> · Tag: <span style={{ color: 'var(--text-secondary)' }}>{token.fourMemeTag}</span></span>}
              </div>
            )}
            {token.timeToGradMinutes && !token.listedOnDex && (
              <div className="mt-2 flex items-center gap-2 rounded-lg p-2"
                style={{ background: token.bondingCurveProgress >= 80 ? 'rgba(0,230,118,0.08)' : 'rgba(240,185,11,0.08)', border: `1px solid ${token.bondingCurveProgress >= 80 ? 'rgba(0,230,118,0.25)' : 'rgba(240,185,11,0.25)'}` }}>
                <Clock size={13} style={{ color: token.bondingCurveProgress >= 80 ? 'var(--green)' : '#f0b90b', flexShrink: 0 }} />
                <div>
                  <div className="text-xs font-bold" style={{ color: token.bondingCurveProgress >= 80 ? 'var(--green)' : '#f0b90b' }}>
                    Graduation predicted in {fmtGradTime(token.timeToGradMinutes)}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Based on bonding curve velocity · PancakeSwap listing at 24 BNB
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rug Risk Panel */}
        {token.rugRisk && (
          <div className="rounded-xl p-3 mb-4" style={{
            background: token.rugRisk.level === 'SAFE' ? 'rgba(0,230,118,0.04)' : token.rugRisk.level === 'DANGER' ? 'rgba(255,64,129,0.06)' : 'rgba(255,202,40,0.05)',
            border: `1px solid ${token.rugRisk.level === 'SAFE' ? 'rgba(0,230,118,0.2)' : token.rugRisk.level === 'DANGER' ? 'rgba(255,64,129,0.25)' : 'rgba(255,202,40,0.2)'}`,
          }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {token.rugRisk.level === 'SAFE'
                  ? <ShieldCheck size={13} style={{ color: 'var(--green)' }} />
                  : token.rugRisk.level === 'DANGER'
                  ? <ShieldX size={13} style={{ color: 'var(--pink)' }} />
                  : <ShieldAlert size={13} style={{ color: 'var(--yellow)' }} />}
                <span className="text-xs font-bold" style={{
                  color: token.rugRisk.level === 'SAFE' ? 'var(--green)' : token.rugRisk.level === 'DANGER' ? 'var(--pink)' : 'var(--yellow)',
                }}>
                  AI Rug Risk: {token.rugRisk.level}
                </span>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                style={{
                  background: token.rugRisk.level === 'SAFE' ? 'rgba(0,230,118,0.12)' : token.rugRisk.level === 'DANGER' ? 'rgba(255,64,129,0.12)' : 'rgba(255,202,40,0.12)',
                  color: token.rugRisk.level === 'SAFE' ? 'var(--green)' : token.rugRisk.level === 'DANGER' ? 'var(--pink)' : 'var(--yellow)',
                }}>
                {token.rugRisk.score}/100
              </span>
            </div>
            {/* Risk bar */}
            <div className="signal-bar mb-2" style={{ height: 4 }}>
              <div style={{
                width: `${token.rugRisk.score}%`, height: '100%', borderRadius: 2,
                background: token.rugRisk.level === 'SAFE'
                  ? 'linear-gradient(90deg, #00e67680, #00e676)'
                  : token.rugRisk.level === 'DANGER'
                  ? 'linear-gradient(90deg, #ff408180, #ff4081)'
                  : 'linear-gradient(90deg, #ffca2880, #ffca28)',
              }} />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {token.rugRisk.summary}
            </p>
            {token.smartMoneyActive && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--purple)' }}>
                🐋 Smart money detected — whale wallets active across multiple FIRE tokens are buying this.
              </div>
            )}
          </div>
        )}

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

        {/* AI Analysis */}
        <div className="mb-4">
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(179,136,255,0.25)', background: 'rgba(179,136,255,0.04)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: aiState !== 'idle' ? '1px solid rgba(179,136,255,0.15)' : 'none' }}>
              <div className="flex items-center gap-2">
                <Bot size={14} color="var(--purple)" />
                <span className="text-xs font-bold" style={{ color: 'var(--purple)' }}>AI Trade Analysis</span>
                {aiState === 'loading' && (
                  <span className="text-xs animate-live" style={{ color: 'var(--purple)' }}>Thinking…</span>
                )}
              </div>
              {aiState === 'idle' || aiState === 'error' ? (
                <button onClick={runAnalysis}
                  className="text-xs font-bold px-3 py-1 rounded-lg"
                  style={{ background: 'rgba(179,136,255,0.15)', color: 'var(--purple)', border: '1px solid rgba(179,136,255,0.3)', cursor: 'pointer' }}>
                  {aiState === 'error' ? 'Retry' : 'Analyse ✦'}
                </button>
              ) : aiState === 'done' ? (
                <button onClick={() => { setAiState('idle'); setAiResult(null); setAiRaw(''); }}
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'transparent', border: 'none' }}>
                  <X size={12} />
                </button>
              ) : null}
            </div>

            {/* Loading — show streaming raw text */}
            {aiState === 'loading' && (
              <div className="px-3 py-2">
                <div className="font-mono text-xs leading-relaxed" style={{ color: 'var(--purple)', opacity: 0.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {aiRaw || '…'}
                  <span className="animate-live">▌</span>
                </div>
              </div>
            )}

            {/* Done — show structured result */}
            {aiState === 'done' && aiResult && (
              <div className="p-3 flex flex-col gap-3">
                {/* Verdict + suggestion row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm" style={{ color: VERDICT_COLOR[aiResult.verdict] }}>
                      {aiResult.verdict === 'BULLISH' ? '▲' : aiResult.verdict === 'BEARISH' ? '▼' : '—'} {aiResult.verdict}
                    </span>
                    <span className="text-xs px-1.5 py-px rounded font-mono"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                      {aiResult.confidence}% confidence
                    </span>
                  </div>
                  <span className="font-bold text-xs px-2.5 py-1 rounded-lg"
                    style={{ background: SUGGESTION_BG[aiResult.suggestion], color: SUGGESTION_COLOR[aiResult.suggestion], border: `1px solid ${SUGGESTION_COLOR[aiResult.suggestion]}30` }}>
                    {aiResult.suggestion}
                    {aiResult.suggestion !== 'AVOID' && aiResult.suggestedSizeUsd > 0 && ` · $${aiResult.suggestedSizeUsd}`}
                  </span>
                </div>

                {/* Thesis */}
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {aiResult.thesis}
                </p>

                {/* Catalyst + Risk */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg p-2" style={{ background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.15)' }}>
                    <div className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: 'var(--green)' }}><Zap size={11} /> Catalyst</div>
                    <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{aiResult.catalyst}</div>
                  </div>
                  <div className="rounded-lg p-2" style={{ background: 'rgba(255,64,129,0.06)', border: '1px solid rgba(255,64,129,0.15)' }}>
                    <div className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: 'var(--pink)' }}><AlertTriangle size={11} /> Risk</div>
                    <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{aiResult.risk}</div>
                  </div>
                </div>

                <p className="text-xs text-center" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                  AI analysis · Not financial advice
                </p>
              </div>
            )}

            {aiState === 'error' && (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--pink)' }}>Failed to load analysis. Check your API key.</div>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-2 mb-2">
          <button className="btn btn-primary flex-1 flex items-center justify-center gap-2" onClick={onAlert}>
            <Bell size={13} /> Set Alert
          </button>
          <a href={token.fourMemeUrl} target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost flex items-center gap-1.5" style={{ fontSize: 12 }}
            onClick={e => e.stopPropagation()}>
            {token.chain === 'bsc' ? 'Four.meme' : 'Chart'} <ExternalLink size={11} />
          </a>
          <button
            className="btn btn-ghost flex items-center gap-1.5"
            style={{ fontSize: 12, color: sharedLink ? 'var(--green)' : undefined }}
            onClick={e => { e.stopPropagation(); shareOnTwitter(); }}
            title="Share on Twitter/X with signal card">
            {sharedLink ? <Check size={12} /> : <XIcon size={12} />}
          </button>
          <button
            className="btn btn-ghost flex items-center gap-1.5"
            style={{ fontSize: 12 }}
            onClick={e => { e.stopPropagation(); copyLink(); }}
            title="Copy signal card link">
            <Share2 size={12} />
          </button>
        </div>

        {/* Social links */}
        {(token.twitterUrl || token.telegramUrl || token.websiteUrl) && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {token.twitterUrl && (
              <a href={token.twitterUrl} target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost text-xs py-1 px-2.5 flex items-center gap-1.5"
                onClick={e => e.stopPropagation()}>
                <ExternalLink size={11} /> Twitter
              </a>
            )}
            {token.telegramUrl && (
              <a href={token.telegramUrl} target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost text-xs py-1 px-2.5 flex items-center gap-1.5"
                onClick={e => e.stopPropagation()}>
                <Send size={11} /> Telegram
              </a>
            )}
            {token.websiteUrl && (
              <a href={token.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost text-xs py-1 px-2.5 flex items-center gap-1.5"
                onClick={e => e.stopPropagation()}>
                <Globe size={11} /> Website
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
