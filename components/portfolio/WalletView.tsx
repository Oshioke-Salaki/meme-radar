'use client';

import { useState, useCallback } from 'react';
import { Search, Flame, Zap, Thermometer, Snowflake, ExternalLink, Wallet } from 'lucide-react';
import { Token } from '@/lib/types';
import TokenAvatar from '@/components/ui/TokenAvatar';
import type { WalletHolding } from '@/app/api/wallet/route';

interface Props {
  tokens: Token[];
  onSelectToken?: (token: Token) => void;
}

const TIER_ICON: Record<string, React.ElementType> = {
  FIRE: Flame, HOT: Zap, WARM: Thermometer, COLD: Snowflake,
};
const TIER_COLOR: Record<string, string> = {
  FIRE: 'var(--green)', HOT: 'var(--blue)', WARM: 'var(--yellow)', COLD: '#8080a8',
};

function formatBalance(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  if (n < 0.01) return n.toExponential(2);
  return n.toFixed(2);
}

function formatUsd(n: number): string {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n < 0.01) return `<$0.01`;
  return `$${n.toFixed(2)}`;
}

export default function WalletView({ tokens, onSelectToken }: Props) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [holdings, setHoldings] = useState<WalletHolding[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedAddress, setCheckedAddress] = useState('');

  const lookup = useCallback(async (addr: string) => {
    const clean = addr.trim();
    if (!clean || !/^0x[0-9a-fA-F]{40}$/.test(clean)) {
      setError('Enter a valid BSC wallet address (0x...)');
      return;
    }
    setLoading(true);
    setError(null);
    setHoldings(null);

    const tokenPayload = tokens
      .filter(t => t.chain === 'bsc' && t.address?.startsWith('0x'))
      .slice(0, 30)
      .map(t => ({
        address: t.address,
        ticker: t.ticker,
        name: t.name,
        priceUsd: t.priceUsd,
        signal: t.signal,
        tier: t.tier,
        color: t.color,
      }));

    try {
      const res = await fetch(
        `/api/wallet?address=${clean}&tokens=${encodeURIComponent(JSON.stringify(tokenPayload))}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHoldings(data.holdings);
      setCheckedAddress(clean);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [tokens]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(address);
  };

  return (
    <div className="card">
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Wallet size={15} style={{ color: 'var(--blue)' }} />
          <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Portfolio Scanner</div>
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Paste a BNB wallet to see your Four.meme holdings with live signals
        </div>
      </div>

      <div className="p-3">
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="0x… wallet address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontFamily: 'monospace',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--border-bright)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <button type="submit" disabled={loading}
            className="btn btn-primary text-xs px-3"
            style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Scanning…' : 'Scan'}
          </button>
        </form>

        {error && (
          <div className="text-xs px-3 py-2 rounded-lg mb-3"
            style={{ background: 'var(--pink-soft)', color: 'var(--pink)', border: '1px solid rgba(255,64,129,0.2)' }}>
            {error}
          </div>
        )}

        {holdings !== null && (
          <>
            {holdings.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  No tracked tokens found
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  This wallet doesn't hold any of the current top Four.meme tokens.
                </div>
                <a
                  href={`https://bscscan.com/address/${checkedAddress}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs mt-2 flex items-center justify-center gap-1"
                  style={{ color: 'var(--blue)' }}>
                  View on BSCScan <ExternalLink size={10} />
                </a>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {holdings.length} holding{holdings.length !== 1 ? 's' : ''} found
                  </span>
                  <a
                    href={`https://bscscan.com/address/${checkedAddress}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs flex items-center gap-1"
                    style={{ color: 'var(--blue)' }}>
                    BSCScan <ExternalLink size={10} />
                  </a>
                </div>
                <div className="flex flex-col gap-2">
                  {holdings.map(h => {
                    const TierIcon = TIER_ICON[h.tier] || Snowflake;
                    const tColor = TIER_COLOR[h.tier] || '#8080a8';
                    const fullToken = tokens.find(t => t.address === h.address);
                    return (
                      <button
                        key={h.address}
                        className="w-full text-left p-3 rounded-xl transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${tColor}25`, cursor: fullToken ? 'pointer' : 'default' }}
                        onClick={() => fullToken && onSelectToken?.(fullToken)}>
                        <div className="flex items-center gap-3">
                          <TokenAvatar color={tColor} name={h.name} ticker={h.ticker} size={32} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold" style={{ color: tColor }}>${h.ticker}</span>
                              <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                {formatUsd(h.balanceUsd)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {formatBalance(h.balance)} tokens
                              </span>
                              <span className="flex items-center gap-1 text-xs font-semibold"
                                style={{ color: tColor }}>
                                <TierIcon size={10} strokeWidth={2.5} />
                                Signal {h.signal}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {holdings === null && !loading && !error && (
          <div className="text-center py-4">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Checks balanceOf across all tracked tokens · No login required
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
