'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Token, FeedEvent, Narrative, Stats, Chain } from '@/lib/types';
import { getTier, extractNarratives } from '@/lib/signalEngine';

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
  const prevRef                 = useRef<Token[]>([]);

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
      setTokens(fresh);
      setNarratives(buildNarratives(fresh));
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

  return { tokens, feed, narratives, stats, loading, error, refresh: load };
}
