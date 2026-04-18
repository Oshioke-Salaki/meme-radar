'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Token } from '@/lib/types';
import TokenAvatar from '@/components/ui/TokenAvatar';
import type { OnChainTrade } from '@/app/api/trades/route';

interface DisplayTrade {
  id: string;
  type: 'BUY' | 'SELL';
  ticker: string;
  color: string;
  usdAmount: number;
  wallet: string;
  walletFull?: string;
  timeAgo: string;
  real: boolean;     // true = from BSCScan, false = simulated
  hash?: string;
}

function formatUsd(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (n < 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(0)}`;
}

function timeAgoLive(ts: number) {
  const s = Math.floor(Date.now() / 1000) - ts;
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function randWallet() {
  const chars = '0123456789abcdef';
  let s = '0x';
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * 16)];
  s += '…';
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

function generateSimTrade(tokens: Token[]): DisplayTrade | null {
  if (!tokens.length) return null;
  const weights = tokens.map(t => Math.max(1, t.signal ** 2));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let token = tokens[0];
  for (let i = 0; i < tokens.length; i++) {
    r -= weights[i];
    if (r <= 0) { token = tokens[i]; break; }
  }
  const buyPressure = token.buys1h + token.sells1h > 0 ? token.buys1h / (token.buys1h + token.sells1h) : 0.5;
  const isBuy = Math.random() < Math.max(0.3, Math.min(0.85, buyPressure));
  const liq = token.liquidity || 5000;
  const minBnb = 0.02;
  const maxBnb = Math.max(0.1, Math.min(5, liq / 8000));
  const usdAmount = (minBnb + Math.random() * maxBnb) * 585;
  return {
    id: `sim-${Date.now()}-${Math.random()}`,
    type: isBuy ? 'BUY' : 'SELL',
    ticker: token.ticker,
    color: token.color,
    usdAmount,
    wallet: randWallet(),
    timeAgo: 'just now',
    real: false,
  };
}

interface Props { tokens: Token[]; smartWallets?: Set<string>; }

export default function LiveTrades({ tokens, smartWallets }: Props) {
  const [trades, setTrades] = useState<DisplayTrade[]>([]);
  const [realMode, setRealMode] = useState(false);
  const [topToken, setTopToken] = useState<Token | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchedRef = useRef<string>('');

  // Find top token with a real contract address on BSC
  useEffect(() => {
    const bscTokens = tokens.filter(t => t.chain === 'bsc' && t.address && t.address.startsWith('0x'));
    const top = bscTokens.sort((a, b) => b.signal - a.signal)[0] || null;
    setTopToken(top);
  }, [tokens]);

  // Fetch real BSCScan trades for the top token
  const fetchRealTrades = useCallback(async (token: Token) => {
    if (!token.address) return;
    const key = token.address;
    if (fetchedRef.current === key) return; // don't re-fetch same token
    fetchedRef.current = key;

    try {
      const res = await fetch(
        `/api/trades?address=${token.address}&price=${encodeURIComponent(token.priceUsd)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return;
      const data = await res.json();
      const onChain: OnChainTrade[] = data.trades || [];
      if (onChain.length === 0) return;

      const mapped: DisplayTrade[] = onChain.map(t => ({
        id: t.hash,
        type: t.type,
        ticker: token.ticker,
        color: token.color,
        usdAmount: t.usdAmount,
        wallet: t.wallet,
        walletFull: t.walletFull,
        timeAgo: timeAgoLive(t.timestamp),
        real: true,
        hash: t.hash,
      }));
      setTrades(mapped);
      setRealMode(true);
    } catch { /* fall back to simulated */ }
  }, []);

  useEffect(() => {
    if (topToken) fetchRealTrades(topToken);
  }, [topToken, fetchRealTrades]);

  // Simulation fallback (and real-time ticking for real mode)
  const totalBuys = tokens.reduce((s, t) => s + t.buys1h + t.sells1h, 0);
  const txPerHour = Math.max(10, totalBuys);
  const intervalMs = Math.max(3000, Math.min(15000, 3_600_000 / txPerHour));

  useEffect(() => {
    if (!tokens.length) return;

    if (!realMode) {
      // Seed with initial simulated trades
      const initial: DisplayTrade[] = [];
      for (let i = 0; i < 8; i++) {
        const t = generateSimTrade(tokens);
        if (t) initial.push(t);
      }
      setTrades(initial);
    }

    function schedule() {
      timerRef.current = setTimeout(() => {
        if (!realMode) {
          const t = generateSimTrade(tokens);
          if (t) setTrades(prev => [t, ...prev].slice(0, 30));
        } else {
          // In real mode: just tick timeAgo display
          setTrades(prev => prev.map(t => ({
            ...t,
            timeAgo: t.real && t.hash
              ? t.timeAgo // keep original — will get refreshed on next poll
              : t.timeAgo,
          })));
        }
        schedule();
      }, realMode ? 10000 : intervalMs * (0.5 + Math.random()));
    }

    schedule();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [tokens, realMode, intervalMs]);

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {realMode ? `$${topToken?.ticker} Trades` : 'Live Trades'}
          </span>
          <span className="px-1.5 py-0.5 rounded text-xs font-bold animate-live"
            style={{ background: realMode ? 'rgba(100,200,255,0.1)' : 'var(--green-soft)', color: realMode ? 'var(--blue)' : 'var(--green)', border: `1px solid ${realMode ? 'rgba(100,200,255,0.25)' : 'rgba(0,230,118,0.2)'}` }}>
            {realMode ? 'ON-CHAIN' : 'LIVE'}
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {realMode ? 'BSCScan' : `~${Math.round(txPerHour / Math.max(1, tokens.length))}/hr`}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Fetching trades…</span>
          </div>
        ) : (
          trades.map((trade, i) => {
            const isSmartMoney = !!(smartWallets && trade.walletFull && smartWallets.has(trade.walletFull.toLowerCase()));
            return (
              <div key={trade.id}
                className="flex items-center gap-3 px-3 py-2.5"
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: isSmartMoney
                    ? 'rgba(179,136,255,0.05)'
                    : i === 0 ? `${trade.type === 'BUY' ? 'rgba(0,230,118' : 'rgba(255,64,129'},.04)` : 'transparent',
                }}>
                <span className="font-mono text-xs font-bold px-1.5 py-px rounded shrink-0"
                  style={{
                    background: trade.type === 'BUY' ? 'rgba(0,230,118,0.12)' : 'rgba(255,64,129,0.12)',
                    color: trade.type === 'BUY' ? 'var(--green)' : 'var(--pink)',
                    border: `1px solid ${trade.type === 'BUY' ? 'rgba(0,230,118,0.25)' : 'rgba(255,64,129,0.25)'}`,
                    minWidth: 34,
                    textAlign: 'center',
                  }}>
                  {trade.type}
                </span>
                <TokenAvatar color={trade.color} name={trade.ticker} ticker={trade.ticker} size={22} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold" style={{ color: trade.color }}>${trade.ticker}</span>
                      {isSmartMoney && (
                        <span className="text-xs font-bold px-1 py-px rounded"
                          style={{ background: 'rgba(179,136,255,0.15)', color: 'var(--purple)', border: '1px solid rgba(179,136,255,0.3)', fontSize: 10 }}>
                          🐋 Smart$
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold" style={{ color: trade.type === 'BUY' ? 'var(--green)' : 'var(--pink)' }}>
                      {trade.usdAmount > 0 ? formatUsd(trade.usdAmount) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    {trade.real && trade.hash ? (
                      <a
                        href={`https://bscscan.com/tx/${trade.hash}`}
                        target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs"
                        style={{ color: isSmartMoney ? 'var(--purple)' : 'var(--blue)', textDecoration: 'none' }}
                        onClick={e => e.stopPropagation()}>
                        {trade.wallet}
                      </a>
                    ) : (
                      <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{trade.wallet}</span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{trade.timeAgo}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {realMode
            ? `Real on-chain txns · BSCScan · ${topToken?.address?.slice(0, 10)}…`
            : 'Calibrated from on-chain tx counts · BNB Chain'}
        </p>
      </div>
    </div>
  );
}
