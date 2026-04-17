'use client';

import { useState, useEffect, useCallback } from 'react';
import { Token, FeedEvent, Narrative, Stats, SignalTier } from '@/lib/types';
import { INITIAL_TOKENS, INITIAL_FEED, INITIAL_NARRATIVES, INITIAL_STATS } from '@/lib/mockData';

function getTier(signal: number): SignalTier {
  if (signal >= 80) return 'FIRE';
  if (signal >= 60) return 'HOT';
  if (signal >= 40) return 'WARM';
  return 'COLD';
}

const MESSAGE_TEMPLATES = [
  (t: Token) => `${t.ticker} velocity up ${Math.floor(Math.random()*400+50)}/hr on X`,
  (t: Token) => `New "${t.narratives[0]}" narrative cluster detected`,
  (t: Token) => `${t.ticker} CT mentions spiking. Watch closely.`,
  (t: Token) => `Telegram group activity +${Math.floor(Math.random()*300+100)}% for ${t.ticker}`,
  (t: Token) => `${t.ticker} signal crossing key threshold`,
];

export function useSimulator() {
  const [tokens, setTokens] = useState<Token[]>(INITIAL_TOKENS);
  const [feed, setFeed] = useState<FeedEvent[]>(INITIAL_FEED);
  const [narratives, setNarratives] = useState<Narrative[]>(INITIAL_NARRATIVES);
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [tick, setTick] = useState(0);

  const updateTokens = useCallback(() => {
    setTokens(prev => prev.map(token => {
      const delta = (Math.random() - 0.45) * 6;
      const newSignal = Math.max(5, Math.min(99, token.signal + delta));
      const newVelocity = Math.max(50, token.socialVelocity + Math.floor((Math.random()-0.4)*200));
      const newSparkline = [...token.sparkline.slice(1), Math.round(newSignal)];
      return {
        ...token,
        signal: Math.round(newSignal),
        signalDelta: Math.round(delta * 10) / 10,
        tier: getTier(newSignal),
        socialVelocity: newVelocity,
        velocityDelta: newVelocity - token.socialVelocity,
        sparkline: newSparkline,
      };
    }));
  }, []);

  const pushFeedEvent = useCallback(() => {
    const t = INITIAL_TOKENS[Math.floor(Math.random() * INITIAL_TOKENS.length)];
    const msgFn = MESSAGE_TEMPLATES[Math.floor(Math.random() * MESSAGE_TEMPLATES.length)];
    const types: FeedEvent['type'][] = ['SIGNAL_UP', 'SIGNAL_DOWN', 'NARRATIVE', 'ALERT'];
    const platforms: FeedEvent['platform'][] = ['X', 'TG', 'Reddit', 'Discord'];
    const colors = ['#00ff88', '#ff2d78', '#ffd60a', '#00d4ff', '#9945ff'];

    const event: FeedEvent = {
      id: `f-${Date.now()}`,
      type: types[Math.floor(Math.random() * types.length)],
      ticker: t.ticker,
      emoji: t.emoji,
      message: msgFn(t),
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      timestamp: new Date(),
      color: colors[Math.floor(Math.random() * colors.length)],
    };

    setFeed(prev => [event, ...prev].slice(0, 30));
  }, []);

  const updateStats = useCallback(() => {
    setStats(prev => ({
      tokensScanned: prev.tokensScanned + Math.floor(Math.random() * 8 + 1),
      activeSignals: Math.max(10, prev.activeSignals + Math.floor((Math.random()-0.4)*3)),
      narrativesTracked: Math.max(5, prev.narrativesTracked + (Math.random() > 0.9 ? 1 : 0)),
      alertsToday: prev.alertsToday + (Math.random() > 0.7 ? 1 : 0),
    }));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      updateTokens();
      updateStats();
      if (Math.random() > 0.5) pushFeedEvent();
    }, 2000);
    return () => clearInterval(interval);
  }, [updateTokens, updateStats, pushFeedEvent]);

  return { tokens, feed, narratives, stats, tick };
}
