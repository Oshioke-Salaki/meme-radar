'use client';

import { useState, useEffect, useMemo } from 'react';
import TopBar from '@/components/layout/TopBar';
import RadarDisplay from '@/components/radar/RadarDisplay';
import SignalCard from '@/components/tokens/SignalCard';
import FeaturedToken from '@/components/tokens/FeaturedToken';
import TokenDetail from '@/components/tokens/TokenDetail';
import LiveFeed from '@/components/feed/LiveFeed';
import LiveTrades from '@/components/feed/LiveTrades';
import NarrativeTracker from '@/components/radar/NarrativeTracker';
import AlertModal from '@/components/ui/AlertModal';
import HowItWorks from '@/components/ui/HowItWorks';
import MyAlerts from '@/components/ui/MyAlerts';
import ToastContainer from '@/components/ui/Toast';
import { useRealData } from '@/hooks/useRealData';
import { useToast } from '@/hooks/useToast';
import { Token, SignalTier, Chain, CHAIN_META } from '@/lib/types';

type TierFilter = 'ALL' | SignalTier;
type DexFilter = 'ALL' | 'bonding' | 'listed';
type SortKey = 'signal' | 'velocity' | 'price' | 'new';

const CHAINS: Chain[] = ['bsc', 'ethereum', 'base', 'solana', 'arbitrum'];

const TIER_BTNS: { key: TierFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'FIRE', label: '🔥 Fire' },
  { key: 'HOT',  label: '⚡ Hot' },
  { key: 'WARM', label: '🌡 Warm' },
  { key: 'COLD', label: '❄️ Cold' },
];

function sortTokens(tokens: Token[], key: SortKey) {
  return [...tokens].sort((a, b) =>
    key === 'signal'   ? b.signal - a.signal :
    key === 'velocity' ? b.socialVelocity - a.socialVelocity :
    key === 'price'    ? b.priceChange24h - a.priceChange24h :
    key === 'new'      ? a.createdAt - b.createdAt : 0
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 flex flex-col gap-3" style={{ width: 390 }}>
        <div className="skeleton rounded-2xl" style={{ height: 390 }} />
        <div className="grid grid-cols-4 gap-2">
          {[0,1,2,3].map(i => <div key={i} className="skeleton rounded-xl" style={{ height: 60 }} />)}
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-3">
        <div className="skeleton rounded-2xl" style={{ height: 280 }} />
        <div className="grid grid-cols-2 gap-3">
          {[0,1,2,3].map(i => <div key={i} className="skeleton rounded-2xl" style={{ height: 200 }} />)}
        </div>
      </div>
      <div className="flex-shrink-0" style={{ width: 310 }}>
        <div className="skeleton rounded-2xl" style={{ height: 400 }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [chain, setChain]           = useState<Chain>('bsc');
  const { tokens, feed, narratives, stats, loading, error, refresh } = useRealData(chain);
  const { toasts, push, remove }    = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [alertToken, setAlertToken] = useState<Token | null>(null);
  const [showHelp, setShowHelp]     = useState(false);
  const [search, setSearch]         = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('ALL');
  const [sortKey, setSortKey]       = useState<SortKey>('signal');
  const [dexFilter, setDexFilter]   = useState<DexFilter>('ALL');
  const [feedTab, setFeedTab]       = useState<'signals' | 'trades'>('trades');
  const [page, setPage]             = useState(1);
  const [mounted, setMounted]       = useState(false);

  const PAGE_SIZE = 10;

  useEffect(() => {
    setMounted(true);
    if (!localStorage.getItem('memeradar_visited')) {
      setShowHelp(true);
      localStorage.setItem('memeradar_visited', '1');
    }
  }, []);

  // Reset selection when chain changes
  useEffect(() => {
    setSelectedId(null);
    setTierFilter('ALL');
    setDexFilter('ALL');
    setSearch('');
    setPage(1);
  }, [chain]);

  // Alert threshold notifications
  useEffect(() => {
    if (!mounted || !tokens.length) return;
    const saved = JSON.parse(localStorage.getItem('memeradar_alerts') || '[]');
    saved.forEach((a: any) => {
      const t = tokens.find(t => t.ticker === a.ticker);
      if (t && t.signal >= a.threshold) {
        const key = `notified_${a.ticker}_${a.threshold}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          push({ type: 'success', title: `${t.emoji} $${t.ticker} hit ${a.threshold}!`, body: 'Signal crossed your threshold.' });
        }
      }
    });
  }, [tokens, mounted]);

  const sorted      = useMemo(() => sortTokens(tokens, sortKey), [tokens, sortKey]);
  const topToken    = useMemo(() => sortTokens(tokens, 'signal')[0] || null, [tokens]);
  const selectedToken = tokens.find(t => t.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    let list = sorted;
    if (tierFilter !== 'ALL') list = list.filter(t => t.tier === tierFilter);
    if (dexFilter === 'listed') list = list.filter(t => t.listedOnDex);
    if (dexFilter === 'bonding') list = list.filter(t => !t.listedOnDex);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.ticker.toLowerCase().includes(q));
    }
    return list;
  }, [sorted, tierFilter, dexFilter, search]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 whenever filters/search change
  useEffect(() => { setPage(1); }, [tierFilter, dexFilter, search, sortKey]);

  const handleAlert = (t: Token) => setAlertToken(t);
  const handleAlertSaved = () => push({ type: 'success', title: `Alert set for $${alertToken?.ticker}`, body: 'You will be notified when the threshold is crossed.' });
  const handleSelect = (id: string) => setSelectedId(p => p === id ? null : id);

  if (!mounted) return null;

  return (
    <div className="min-h-screen grid-bg">
      <TopBar stats={stats} search={search} onSearch={setSearch} onHelp={() => setShowHelp(true)} tokens={tokens} chain={chain} />

      <main className="max-w-[1680px] mx-auto px-4 py-4 flex flex-col gap-5">

        {/* ── Chain selector ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Chain:</span>
          {CHAINS.map(c => {
            const m = CHAIN_META[c];
            const active = chain === c;
            return (
              <button key={c} onClick={() => setChain(c)}
                className="btn text-xs py-1.5 px-3 flex items-center gap-1.5"
                style={{
                  background: active ? `${m.color}18` : 'rgba(255,255,255,0.03)',
                  color: active ? m.color : 'var(--text-secondary)',
                  border: active ? `1px solid ${m.color}40` : '1px solid var(--border)',
                  borderRadius: 8,
                }}>
                {m.icon} {m.label}
              </button>
            );
          })}
          {/* Refresh + status */}
          <div className="flex-1" />
          {error && (
            <span className="text-xs px-2 py-1 rounded" style={{ color: 'var(--pink)', background: 'var(--pink-soft)' }}>
              {error}
            </span>
          )}
          <button className="btn btn-ghost text-xs py-1.5 px-3" onClick={refresh} disabled={loading}>
            {loading ? '⟳ Loading…' : '⟳ Refresh'}
          </button>
        </div>

        {/* ── Loading state ── */}
        {loading && !tokens.length ? (
          <LoadingSkeleton />
        ) : tokens.length === 0 ? (
          <div className="card py-20 text-center">
            <div className="text-4xl mb-3">📡</div>
            <div className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
              No tokens found on {CHAIN_META[chain].label}
            </div>
            <div className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              This chain may not have active meme tokens right now.
            </div>
            <button className="btn btn-primary" onClick={() => setChain('bsc')}>
              Switch to BNB Chain (Four.meme)
            </button>
          </div>
        ) : (
          <>
            {/* ── Hero row ── */}
            <div className="flex gap-4 items-start hero-row">

              {/* Left: Radar + tier tiles + my alerts */}
              <div className="flex-shrink-0 flex flex-col gap-3 hero-left" style={{ width: 390 }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                      Signal <span className="text-glow-green" style={{ color: 'var(--green)' }}>Radar</span>
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Each dot is a token. Tap or click to inspect.
                    </p>
                  </div>
                  <span className="font-mono text-xs px-2 py-1 rounded-full"
                    style={{ background: 'var(--green-soft)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.2)' }}>
                    {tokens.length} live
                  </span>
                </div>

                <RadarDisplay tokens={tokens} selectedId={selectedId} onSelect={handleSelect} chain={chain} />

                <div className="grid grid-cols-4 gap-2">
                  {(['FIRE','HOT','WARM','COLD'] as const).map(t => {
                    const c = { FIRE:'var(--green)', HOT:'var(--blue)', WARM:'var(--yellow)', COLD:'#8080a8' }[t];
                    const icon = { FIRE:'🔥', HOT:'⚡', WARM:'🌡', COLD:'❄️' }[t];
                    const active = tierFilter === t;
                    const count = tokens.filter(tk => tk.tier === t).length;
                    return (
                      <button key={t} onClick={() => setTierFilter(p => p === t ? 'ALL' : t)}
                        className="rounded-xl p-2 text-center transition-all"
                        style={{ background: active ? `${c}14` : 'rgba(255,255,255,0.02)', border: active ? `1px solid ${c}40` : '1px solid var(--border)', cursor: 'pointer' }}>
                        <div className="text-sm">{icon}</div>
                        <div className="font-mono text-xs font-bold mt-0.5" style={{ color: active ? c : 'var(--text-muted)' }}>{t}</div>
                        <div className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>{count}</div>
                      </button>
                    );
                  })}
                </div>

                <MyAlerts tokens={tokens} onAlert={handleAlert} />
              </div>

              {/* Center: Featured + top 4 */}
              <div className="flex-1 min-w-0 flex flex-col gap-3 hero-center">
                {topToken && (
                  <FeaturedToken key={`${chain}-${topToken.id}`} token={topToken} onAlert={() => handleAlert(topToken)} />
                )}
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Next hottest</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Tap a card · 🔔 to alert</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {sortTokens(tokens, 'signal').slice(1, 5).map(t => (
                    <SignalCard key={t.id} token={t} selected={t.id === selectedId}
                      onClick={() => handleSelect(t.id)} onAlert={() => handleAlert(t)} />
                  ))}
                </div>
              </div>

              {/* Right: Detail or narratives */}
              <div className="flex-shrink-0 flex flex-col gap-3 hero-right" style={{ width: 310 }}>
                {selectedToken ? (
                  <TokenDetail token={selectedToken} onClose={() => setSelectedId(null)} onAlert={() => handleAlert(selectedToken)} />
                ) : (
                  <NarrativeTracker narratives={narratives} />
                )}
              </div>
            </div>

            {/* ── All tokens ── */}
            <div className="flex gap-4 items-start token-list-row">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    All Tokens
                    {(tierFilter !== 'ALL' || dexFilter !== 'ALL' || search) && (
                      <span className="ml-2 font-normal text-sm" style={{ color: 'var(--text-secondary)' }}>
                        ({filtered.length})
                      </span>
                    )}
                  </h2>
                  <div className="flex gap-1.5 flex-wrap">
                    {TIER_BTNS.map(btn => (
                      <button key={btn.key} className="btn text-xs py-1 px-2.5"
                        style={{
                          background: tierFilter === btn.key ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.03)',
                          color: tierFilter === btn.key ? 'var(--green)' : 'var(--text-secondary)',
                          border: tierFilter === btn.key ? '1px solid rgba(0,230,118,0.25)' : '1px solid var(--border)',
                          borderRadius: 7,
                        }}
                        onClick={() => setTierFilter(btn.key)}>
                        {btn.label}
                      </button>
                    ))}
                    <span style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 2px' }} />
                    {([['ALL','All stages'],['listed','✓ On DEX'],['bonding','◎ Bonding']] as [DexFilter, string][]).map(([k, label]) => (
                      <button key={k} className="btn text-xs py-1 px-2.5"
                        style={{
                          background: dexFilter === k ? 'rgba(240,185,11,0.1)' : 'rgba(255,255,255,0.03)',
                          color: dexFilter === k ? '#f0b90b' : 'var(--text-secondary)',
                          border: dexFilter === k ? '1px solid rgba(240,185,11,0.3)' : '1px solid var(--border)',
                          borderRadius: 7,
                        }}
                        onClick={() => setDexFilter(k)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sort:</span>
                    <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                      className="text-xs px-2 py-1.5 rounded-lg outline-none"
                      style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontFamily: 'inherit', cursor: 'pointer' }}>
                      <option value="signal">Signal score</option>
                      <option value="velocity">Mentions/hr</option>
                      <option value="price">24h change</option>
                      <option value="new">Newest</option>
                    </select>
                  </div>
                  {(tierFilter !== 'ALL' || dexFilter !== 'ALL' || search) && (
                    <button className="btn btn-ghost text-xs py-1 px-2.5" onClick={() => { setTierFilter('ALL'); setDexFilter('ALL'); setSearch(''); }}>
                      ✕ Clear
                    </button>
                  )}
                </div>

                {filtered.length === 0 ? (
                  <div className="card py-16 text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <div className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No tokens found</div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Try a different search or filter</div>
                    <button className="btn btn-ghost mt-4" onClick={() => { setSearch(''); setTierFilter('ALL'); }}>
                      Show all tokens
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))' }}>
                      {paginated.map(t => (
                        <SignalCard key={t.id} token={t} selected={t.id === selectedId}
                          onClick={() => handleSelect(t.id)} onAlert={() => handleAlert(t)} />
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} tokens
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            className="btn btn-ghost text-xs py-1 px-2.5"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            style={{ opacity: page === 1 ? 0.35 : 1 }}>
                            ← Prev
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                            .reduce<(number | '…')[]>((acc, p, i, arr) => {
                              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                              acc.push(p);
                              return acc;
                            }, [])
                            .map((p, i) =>
                              p === '…' ? (
                                <span key={`ellipsis-${i}`} className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>…</span>
                              ) : (
                                <button key={p} onClick={() => setPage(p as number)}
                                  className="w-8 h-8 rounded-lg text-xs font-mono font-bold"
                                  style={{
                                    background: page === p ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.03)',
                                    color: page === p ? 'var(--green)' : 'var(--text-secondary)',
                                    border: page === p ? '1px solid rgba(0,230,118,0.3)' : '1px solid var(--border)',
                                    cursor: 'pointer',
                                  }}>
                                  {p}
                                </button>
                              )
                            )}
                          <button
                            className="btn btn-ghost text-xs py-1 px-2.5"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            style={{ opacity: page === totalPages ? 0.35 : 1 }}>
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex-shrink-0 live-feed-col flex flex-col" style={{ width: 332, height: 600 }}>
                {/* Tab switcher */}
                <div className="flex rounded-xl overflow-hidden mb-2" style={{ border: '1px solid var(--border)' }}>
                  {(['trades', 'signals'] as const).map(tab => (
                    <button key={tab} onClick={() => setFeedTab(tab)}
                      className="flex-1 py-2 text-xs font-semibold capitalize"
                      style={{
                        background: feedTab === tab ? 'rgba(0,230,118,0.1)' : 'rgba(255,255,255,0.02)',
                        color: feedTab === tab ? 'var(--green)' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                      }}>
                      {tab === 'trades' ? '💹 Live Trades' : '📡 Signal Feed'}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-h-0">
                  {feedTab === 'trades'
                    ? <LiveTrades tokens={tokens} />
                    : <LiveFeed events={feed} />
                  }
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>MemeRadar v0.1 · Four.meme AI Sprint 2026</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Not financial advice</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
            <a href="/api/skill" target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: 'var(--purple)' }}>
              🧩 Purrfect Claw Skill API ↗
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-live" style={{ background: 'var(--green)' }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Live data · DexScreener · {tokens.length} tokens
            </span>
          </div>
        </div>
      </main>

      {alertToken && <AlertModal token={alertToken} onClose={() => setAlertToken(null)} onSaved={handleAlertSaved} />}
      {showHelp && <HowItWorks onClose={() => setShowHelp(false)} />}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  );
}
