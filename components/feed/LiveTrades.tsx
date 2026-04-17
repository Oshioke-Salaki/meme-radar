'use client';

import { useState, useEffect, useRef } from 'react';
import { Token, CHAIN_META } from '@/lib/types';

interface Trade {
  id: string;
  type: 'BUY' | 'SELL';
  ticker: string;
  emoji: string;
  color: string;
  bnbAmount: number;
  usdAmount: number;
  wallet: string;
  time: Date;
  priceUsd: string;
}

function randWallet() {
  const chars = '0123456789abcdef';
  let s = '0x';
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * 16)];
  s += '…';
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

function formatUsd(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function generateTrade(tokens: Token[]): Trade | null {
  if (!tokens.length) return null;
  // Weight toward higher-signal tokens
  const weights = tokens.map(t => Math.max(1, t.signal ** 2));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let token = tokens[0];
  for (let i = 0; i < tokens.length; i++) {
    r -= weights[i];
    if (r <= 0) { token = tokens[i]; break; }
  }

  const buyPressure = token.buys1h + token.sells1h > 0
    ? token.buys1h / (token.buys1h + token.sells1h)
    : 0.5;
  const isBuy = Math.random() < Math.max(0.3, Math.min(0.85, buyPressure));

  // Calibrate trade size to token liquidity
  const liq = token.liquidity || 5000;
  const minBnb = 0.02;
  const maxBnb = Math.max(0.1, Math.min(5, liq / 8000));
  const bnbAmount = minBnb + Math.random() * maxBnb;
  const bnbPrice = 580 + Math.random() * 60;
  const usdAmount = bnbAmount * bnbPrice;

  return {
    id: `${Date.now()}-${Math.random()}`,
    type: isBuy ? 'BUY' : 'SELL',
    ticker: token.ticker,
    emoji: token.emoji,
    color: token.color,
    bnbAmount,
    usdAmount,
    wallet: randWallet(),
    time: new Date(),
    priceUsd: token.priceUsd,
  };
}

interface Props {
  tokens: Token[];
}

export default function LiveTrades({ tokens }: Props) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate how fast to generate trades based on actual on-chain activity
  const totalBuys = tokens.reduce((s, t) => s + t.buys1h + t.sells1h, 0);
  const txPerHour = Math.max(10, totalBuys);
  const intervalMs = Math.max(2000, Math.min(12000, (3_600_000 / txPerHour)));

  useEffect(() => {
    if (!tokens.length) return;

    function schedule() {
      const jitter = intervalMs * (0.5 + Math.random());
      timerRef.current = setTimeout(() => {
        const t = generateTrade(tokens);
        if (t) {
          setTrades(prev => [t, ...prev].slice(0, 30));
        }
        schedule();
      }, jitter);
    }

    // Seed with a few initial trades
    const initial: Trade[] = [];
    for (let i = 0; i < 6; i++) {
      const t = generateTrade(tokens);
      if (t) {
        t.time = new Date(Date.now() - i * intervalMs * 1.5);
        initial.push(t);
      }
    }
    setTrades(initial);
    schedule();

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [tokens]);

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Live Trades</span>
          <span className="px-1.5 py-0.5 rounded text-xs font-bold animate-live"
            style={{ background: 'var(--green-soft)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.2)' }}>
            LIVE
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          ~{Math.round(txPerHour / tokens.length || 0)}/hr per token
        </span>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Waiting for trades…</span>
          </div>
        ) : (
          trades.map((trade, i) => (
            <div key={trade.id}
              className="flex items-center gap-3 px-3 py-2.5 animate-slide-right"
              style={{
                borderBottom: '1px solid var(--border)',
                animationDelay: i === 0 ? '0ms' : '0ms',
                animationFillMode: 'both',
                background: i === 0 ? `${trade.type === 'BUY' ? 'rgba(0,230,118' : 'rgba(255,64,129'},.04)` : 'transparent',
              }}>
              {/* Buy/Sell badge */}
              <span className="font-mono text-xs font-bold px-1.5 py-px rounded flex-shrink-0"
                style={{
                  background: trade.type === 'BUY' ? 'rgba(0,230,118,0.12)' : 'rgba(255,64,129,0.12)',
                  color: trade.type === 'BUY' ? 'var(--green)' : 'var(--pink)',
                  border: `1px solid ${trade.type === 'BUY' ? 'rgba(0,230,118,0.25)' : 'rgba(255,64,129,0.25)'}`,
                  minWidth: 34,
                  textAlign: 'center',
                }}>
                {trade.type}
              </span>

              {/* Token */}
              <span className="text-sm flex-shrink-0">{trade.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold" style={{ color: trade.color }}>${trade.ticker}</span>
                  <span className="font-mono text-xs font-bold" style={{ color: trade.type === 'BUY' ? 'var(--green)' : 'var(--pink)' }}>
                    {formatUsd(trade.usdAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    {trade.wallet}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(trade.time)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Simulated from on-chain tx counts · BNB Chain
        </p>
      </div>
    </div>
  );
}
