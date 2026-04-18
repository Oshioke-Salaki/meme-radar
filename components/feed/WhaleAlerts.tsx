'use client';

import { useState, useEffect, useCallback } from 'react';
import { Token } from '@/lib/types';
import TokenAvatar from '@/components/ui/TokenAvatar';
import type { WhaleEvent } from '@/app/api/whales/route';

function formatUsd(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

interface Props { tokens: Token[]; }

export default function WhaleAlerts({ tokens }: Props) {
  const [whales, setWhales] = useState<WhaleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(0);

  const fetch_ = useCallback(async () => {
    const fireTokens = tokens
      .filter(t => (t.tier === 'FIRE' || t.tier === 'HOT') && t.address.startsWith('0x'))
      .slice(0, 5)
      .map(t => ({ address: t.address, ticker: t.ticker, color: t.color, priceUsd: t.priceUsd }));

    if (!fireTokens.length) { setLoading(false); return; }

    try {
      const res = await fetch('/api/whales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: fireTokens }),
      });
      const data = await res.json();
      if (data.whales?.length) setWhales(data.whales);
      setLastFetch(Date.now());
    } catch { /* keep previous */ }
    setLoading(false);
  }, [tokens]);

  useEffect(() => {
    if (!tokens.length) return;
    if (Date.now() - lastFetch > 60_000) fetch_();
  }, [tokens, fetch_, lastFetch]);

  const tokenMap = new Map(tokens.map(t => [t.ticker, t]));

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Whale Alerts</span>
          <span className="px-1.5 py-0.5 rounded text-xs font-bold"
            style={{ background: 'rgba(179,136,255,0.1)', color: 'var(--purple)', border: '1px solid rgba(179,136,255,0.25)' }}>
            ≥$150
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>On-chain</span>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Scanning on-chain…</span>
          </div>
        ) : whales.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span style={{ fontSize: 28 }}>🐋</span>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>No whale trades in last 15 min</span>
          </div>
        ) : (
          whales.map((w, i) => {
            const t = tokenMap.get(w.ticker);
            return (
              <div key={`${w.hash}-${i}`}
                className="flex items-center gap-3 px-3 py-2.5"
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: i === 0 ? `${w.type === 'BUY' ? 'rgba(0,230,118' : 'rgba(255,64,129'},.04)` : 'transparent',
                }}>
                {/* Size badge */}
                <div className="shrink-0 flex flex-col items-center gap-0.5">
                  <span className="font-mono text-xs font-bold px-1.5 py-px rounded"
                    style={{
                      background: w.type === 'BUY' ? 'rgba(0,230,118,0.12)' : 'rgba(255,64,129,0.12)',
                      color: w.type === 'BUY' ? 'var(--green)' : 'var(--pink)',
                      border: `1px solid ${w.type === 'BUY' ? 'rgba(0,230,118,0.25)' : 'rgba(255,64,129,0.25)'}`,
                      minWidth: 34, textAlign: 'center',
                    }}>
                    {w.type}
                  </span>
                  {w.usdAmount >= 1000 && (
                    <span style={{ fontSize: 14 }}>🐋</span>
                  )}
                </div>

                <TokenAvatar color={w.color} name={w.ticker} ticker={w.ticker} imageUrl={t?.imageUrl} size={24} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold" style={{ color: w.color }}>${w.ticker}</span>
                    <span className="font-mono text-sm font-bold"
                      style={{ color: w.type === 'BUY' ? 'var(--green)' : 'var(--pink)' }}>
                      {formatUsd(w.usdAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <a href={`https://bscscan.com/tx/${w.hash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="font-mono text-xs"
                      style={{ color: 'var(--blue)', textDecoration: 'none' }}
                      onClick={e => e.stopPropagation()}>
                      {w.wallet}
                    </a>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{w.timeAgo}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Trades ≥$150 · FIRE/HOT tokens · BSC on-chain · last 15 min
        </p>
      </div>
    </div>
  );
}
