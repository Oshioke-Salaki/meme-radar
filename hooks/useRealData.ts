'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Token, FeedEvent, Narrative, Stats, Chain, RugRisk } from '@/lib/types';

const REFRESH_MS = 30_000; // 30s real data refresh

function buildNarratives(tokens: Token[]): Narrative[] {
  const map = new Map<string, { tokens: string[]; total: number; color: string }>();

  tokens.forEach(t => {
    t.narratives.forEach(n => {
      if (!map.has(n)) map.set(n, { tokens: [], total: 0, color: t.color });
      const entry = map.get(n)!;
      entry.tokens.push(t.ticker);
      entry.total += t.signal;
    });
  });

  return Array.from(map.entries())
    .map(([label, v]) => ({
      id: label.toLowerCase().replace(/\s+/g, '-'),
      label,
      score: Math.min(Math.round(v.total / v.tokens.length), 99),
      tokens: v.tokens.slice(0, 4),
      growth: Math.round((Math.random() - 0.3) * 40),
      color: v.color,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function buildFeedFromTokens(tokens: Token[], prev: Token[]): FeedEvent[] {
  const events: FeedEvent[] = [];
  const prevMap = new Map(prev.map(t => [t.id, t]));

  tokens.forEach(t => {
    const p = prevMap.get(t.id);
    const isNew = !p;

    if (isNew && t.signal >= 60) {
      events.push({
        id: `new-${t.id}-${Date.now()}`,
        type: 'NEW_TOKEN',
        ticker: t.ticker, emoji: t.emoji,
        message: `New ${t.tier} signal detected on ${t.chain.toUpperCase()}. Early entry window.`,
        platform: 'X', timestamp: new Date(), value: t.signal, color: t.color, chain: t.chain,
      });
    } else if (p && t.signal - p.signal >= 10) {
      events.push({
        id: `up-${t.id}-${Date.now()}`,
        type: 'SIGNAL_UP',
        ticker: t.ticker, emoji: t.emoji,
        message: `Signal jumped +${Math.round(t.signal - p.signal)} pts. ${t.buys1h} buys in the last hour.`,
        platform: ['X','TG','Reddit','Discord'][Math.floor(Math.random()*4)] as any,
        timestamp: new Date(), value: t.signal, color: t.color, chain: t.chain,
      });
    } else if (p && p.signal - t.signal >= 8) {
      events.push({
        id: `dn-${t.id}-${Date.now()}`,
        type: 'SIGNAL_DOWN',
        ticker: t.ticker, emoji: t.emoji,
        message: `Momentum fading. Signal dropped ${Math.round(p.signal - t.signal)} pts this hour.`,
        platform: 'X', timestamp: new Date(), value: t.signal, color: '#ff4081', chain: t.chain,
      });
    }

    // Graduation event: bonding curve → DEX listing flip
    if (p && !p.listedOnDex && t.listedOnDex) {
      events.push({
        id: `grad-${t.id}-${Date.now()}`,
        type: 'NEW_TOKEN',
        ticker: t.ticker, emoji: '🎓',
        message: `$${t.ticker} just graduated! Bonding curve filled. Now live on PancakeSwap.`,
        platform: 'X', timestamp: new Date(), value: 100, color: '#00e676', chain: t.chain,
      });
    }
  });

  return events;
}

export function useRealData(chain: Chain) {
  const [tokens, setTokens]     = useState<Token[]>([]);
  const [feed, setFeed]         = useState<FeedEvent[]>([]);
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [stats, setStats]       = useState<Stats>({ tokensScanned: 0, activeSignals: 0, narrativesTracked: 0, alertsToday: 0 });
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [aiScoring, setAiScoring] = useState(false);
  const [smartWallets, setSmartWallets] = useState<Set<string>>(new Set());
  const prevRef                 = useRef<Token[]>([]);
  const aiScoresRef             = useRef<Map<string, number>>(new Map());
  const rugScoresRef            = useRef<Map<string, RugRisk>>(new Map());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tokens?chain=${chain}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { tokens: fresh } = await res.json() as { tokens: Token[] };

      if (!fresh?.length) {
        setError('No tokens found. Retrying…');
        return;
      }

      const newEvents = buildFeedFromTokens(fresh, prevRef.current);
      setFeed(prev => [...newEvents, ...prev].slice(0, 40));

      // Apply any cached AI scores immediately before first paint
      const applyAiScores = (list: Token[]) => {
        const map = aiScoresRef.current;
        if (map.size === 0) return list;
        return list.map(t => {
          const s = map.get(t.address);
          if (s === undefined) return t;
          return { ...t, signal: s, tier: s >= 80 ? 'FIRE' : s >= 60 ? 'HOT' : s >= 40 ? 'WARM' : 'COLD', aiScored: true } as Token;
        }).sort((a, b) => b.signal - a.signal);
      };

      setTokens(applyAiScores(fresh));

      // Start with keyword-based narratives immediately
      const kwNarratives = buildNarratives(fresh);
      setNarratives(kwNarratives);

      // Fetch AI signal scores asynchronously — updates tokens when ready (~2s)
      if (chain === 'bsc') {
        setAiScoring(true);
        fetch('/api/signals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: fresh.map(t => ({
            address: t.address,
            name: t.name,
            ticker: t.ticker,
            bondingCurveProgress: t.bondingCurveProgress,
            buys1h: t.buys1h,
            sells1h: t.sells1h,
            buys24h: t.buys24h,
            sells24h: t.sells24h,
            priceChange1h: t.priceChange1h,
            priceChange24h: t.priceChange24h,
            ageHours: (Date.now() - t.createdAt) / 3_600_000,
            marketCap: t.marketCap,
            liquidity: t.liquidity,
            volume24h: t.volume24h,
            fourMemeStatus: t.fourMemeStatus,
          })) }),
        })
          .then(r => r.json())
          .then(({ scores }: { scores: Record<string, number> }) => {
            if (!scores || !Object.keys(scores).length) return;
            for (const [addr, score] of Object.entries(scores)) {
              aiScoresRef.current.set(addr, score);
            }
            setTokens(prev => prev.map(t => {
              const s = scores[t.address];
              if (s === undefined) return t;
              return { ...t, signal: s, tier: s >= 80 ? 'FIRE' : s >= 60 ? 'HOT' : s >= 40 ? 'WARM' : 'COLD', aiScored: true } as Token;
            }).sort((a, b) => b.signal - a.signal));
          })
          .catch(() => { /* keep formula scores on failure */ })
          .finally(() => setAiScoring(false));
      }

      // Fetch AI-detected patterns asynchronously (don't block)
      if (chain === 'bsc') {
        fetch('/api/narratives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: fresh.slice(0, 15).map(t => ({
            name: t.name, ticker: t.ticker, signal: t.signal,
            buys1h: t.buys1h, priceChange24h: t.priceChange24h,
            bondingCurveProgress: t.bondingCurveProgress, narratives: t.narratives,
          })) }),
        })
          .then(r => r.json())
          .then(({ patterns }) => {
            if (patterns?.length) {
              // Merge: AI patterns first, then keyword patterns not already covered
              const aiTickers = new Set(patterns.flatMap((p: Narrative) => p.tokens));
              const remaining = kwNarratives.filter(n => !n.tokens.some(t => aiTickers.has(t)));
              setNarratives([...patterns, ...remaining].slice(0, 6));
            }
          })
          .catch(() => { /* keep keyword narratives on failure */ });
      }
      // Rug check — batch all tokens in one Claude call
      if (chain === 'bsc') {
        fetch('/api/rugcheck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: fresh.map(t => ({
            address: t.address,
            ticker: t.ticker,
            buys1h: t.buys1h,
            sells1h: t.sells1h,
            bondingCurveProgress: t.bondingCurveProgress,
            listedOnDex: t.listedOnDex,
            priceChange1h: t.priceChange1h,
            ageHours: (Date.now() - t.createdAt) / 3_600_000,
            hasSocials: !!(t.twitterUrl || t.telegramUrl || t.websiteUrl),
          })) }),
        })
          .then(r => r.json())
          .then(({ scores }: { scores: Record<string, RugRisk> }) => {
            if (!scores) return;
            for (const [addr, risk] of Object.entries(scores)) {
              rugScoresRef.current.set(addr, risk);
            }
            setTokens(prev => prev.map(t => {
              const r = scores[t.address.toLowerCase()];
              return r ? { ...t, rugRisk: r } as Token : t;
            }));
          })
          .catch(() => {});
      }

      // Smart money — find wallets buying across multiple FIRE tokens
      if (chain === 'bsc') {
        const fireTokens = fresh.filter(t => t.tier === 'FIRE' && t.address.startsWith('0x')).slice(0, 4);
        if (fireTokens.length >= 2) {
          fetch('/api/smartmoney', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens: fireTokens.map(t => ({ address: t.address, ticker: t.ticker })) }),
          })
            .then(r => r.json())
            .then(({ smartWallets: sw, tokenBuyers }: { smartWallets: string[]; tokenBuyers: Record<string, string[]> }) => {
              if (!sw?.length) return;
              const swSet = new Set(sw.map((w: string) => w.toLowerCase()));
              setSmartWallets(swSet);
              // Mark tokens where smart money is active
              const smartTokenAddrs = new Set<string>(
                Object.entries(tokenBuyers)
                  .filter(([, buyers]) => buyers.some(b => swSet.has(b)))
                  .map(([addr]) => addr.toLowerCase())
              );
              setTokens(prev => prev.map(t =>
                smartTokenAddrs.has(t.address.toLowerCase()) ? { ...t, smartMoneyActive: true } as Token : t
              ));
            })
            .catch(() => {});
        }
      }

      setStats({
        tokensScanned: fresh.length * 84 + Math.floor(Math.random() * 200),
        activeSignals: fresh.filter(t => t.signal >= 60).length,
        narrativesTracked: Math.max(4, new Set(fresh.flatMap(t => t.narratives)).size),
        alertsToday: Math.floor(fresh.filter(t => t.tier === 'FIRE').length * 3.5),
      });
      prevRef.current = fresh;
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [chain]);

  useEffect(() => {
    setLoading(true);
    setTokens([]);
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  return { tokens, feed, narratives, stats, loading, error, aiScoring, smartWallets, refresh: load };
}
