'use client';

import { useState, useEffect } from 'react';
import { Search, HelpCircle, RefreshCw } from 'lucide-react';
import { Stats, Token, CHAIN_META, Chain } from '@/lib/types';

interface Props {
  stats: Stats;
  search: string;
  onSearch: (v: string) => void;
  onHelp: () => void;
  tokens?: Token[];
  chain?: Chain;
}

export default function TopBar({ stats, search, onSearch, onHelp, tokens = [], chain = 'bsc' }: Props) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const u = () => setTime(new Date().toUTCString().slice(17, 25));
    u(); const t = setInterval(u, 1000); return () => clearInterval(t);
  }, []);

  const tickerItems = tokens.length > 0
    ? tokens.slice(0, 12).map(t => ({
        ticker: t.ticker,
        change: `${t.priceChange24h >= 0 ? '+' : ''}${t.priceChange24h.toFixed(1)}%`,
        color: t.priceChange24h >= 0 ? 'var(--green)' : 'var(--pink)',
        signal: t.signal,
      }))
    : [];
  const doubled = tickerItems.length > 0 ? [...tickerItems, ...tickerItems] : null;
  const chainMeta = CHAIN_META[chain];

  return (
    <header className="sticky top-0 z-50"
      style={{ background: 'rgba(7,7,15,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)' }}>

      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="relative w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00e676 0%, #40c4ff 100%)', boxShadow: '0 0 16px rgba(0,230,118,0.35)' }}>
            <span className="font-bold text-sm text-black" style={{ fontFamily: 'monospace' }}>M</span>
            <span className="absolute inset-0 rounded-lg animate-ring" style={{ border: '1px solid rgba(0,230,118,0.4)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight">
                Meme<span className="text-glow-green" style={{ color: 'var(--green)' }}>Radar</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-live" style={{ background: 'var(--green)' }} />
            </div>
            <div className="font-mono text-xs -mt-0.5 hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              Bloomberg Terminal for Four.meme
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by token name or ticker…"
              value={search}
              onChange={e => onSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--border-bright)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="hidden lg:flex items-center gap-5">
          {[
            { label: 'Tokens scanned', value: stats.tokensScanned.toLocaleString(), color: 'var(--blue)' },
            { label: 'Active signals', value: stats.activeSignals.toString(), color: 'var(--green)' },
            { label: 'Alerts fired', value: stats.alertsToday.toString(), color: 'var(--yellow)' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="font-mono font-bold text-sm" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-mono text-xs hidden md:block" style={{ color: 'var(--text-muted)' }}>UTC {time}</span>
          <button className="btn btn-ghost text-xs flex items-center gap-1.5" onClick={onHelp}>
            <HelpCircle size={13} /> <span className="hidden sm:inline">How it works</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: `${chainMeta.color}15`, border: `1px solid ${chainMeta.color}35`, color: chainMeta.color }}>
            <span className="w-1.5 h-1.5 rounded-full animate-live" style={{ background: chainMeta.color }} />
            {chainMeta.label}
          </div>
        </div>
      </div>

      {/* Ticker strip — real token data */}
      {doubled && (
        <div className="overflow-hidden relative" style={{ borderTop: '1px solid var(--border)', height: 28, background: 'rgba(0,0,0,0.25)' }}>
          <div className="absolute inset-y-0 left-0 w-12 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, rgba(7,7,15,1), transparent)' }} />
          <div className="absolute inset-y-0 right-0 w-12 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(270deg, rgba(7,7,15,1), transparent)' }} />
          <div className="flex items-center h-full animate-ticker" style={{ width: 'max-content' }}>
            {doubled.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-5 font-mono text-xs">
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: 'var(--text-secondary)' }}>${item.ticker}</span>
                <span style={{ color: item.color, fontWeight: 700 }}>{item.change}</span>
                <span className="text-xs px-1 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                  sig {item.signal}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
