'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Trophy, Clock } from 'lucide-react';

interface HistoryEntry {
  ticker: string;
  name: string;
  signalAtFlag: number;
  priceAtFlag: string;
  latestPrice: string;
  flaggedAt: number;
  wentUp: boolean | null;
}

interface AccuracyStats {
  total: number;
  wentUp: number;
  pct: number | null;
  recent: HistoryEntry[];
}

function pctGain(from: string, to: string): number | null {
  const a = parseFloat(from), b = parseFloat(to);
  if (!a || !b) return null;
  return Math.round(((b - a) / a) * 100);
}

function timeAgo(ts: number) {
  const h = (Date.now() - ts) / 3_600_000;
  if (h < 1) return `${Math.round(h * 60)}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function CorrectCalls() {
  const [stats, setStats] = useState<AccuracyStats | null>(null);

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const wins = stats?.recent.filter(e => e.wentUp === true) ?? [];

  if (!wins.length) return null;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} style={{ color: '#f0b90b' }} />
        <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Correct Calls</span>
        {stats?.pct != null && (
          <span className="ml-auto font-mono text-xs font-bold px-2 py-0.5 rounded"
            style={{
              background: stats.pct >= 60 ? 'rgba(0,230,118,0.1)' : 'rgba(255,202,40,0.1)',
              color: stats.pct >= 60 ? 'var(--green)' : 'var(--yellow)',
            }}>
            {stats.pct}% accuracy
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {wins.slice(0, 6).map((entry, i) => {
          const gain = pctGain(entry.priceAtFlag, entry.latestPrice);
          return (
            <div key={i} className="flex items-center gap-3 px-2.5 py-2 rounded-lg"
              style={{ background: 'rgba(0,230,118,0.04)', border: '1px solid rgba(0,230,118,0.12)' }}>
              <div className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0"
                style={{ background: 'rgba(0,230,118,0.15)', color: 'var(--green)' }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold" style={{ color: 'var(--green)' }}>
                    ${entry.ticker}
                  </span>
                  <span className="text-xs px-1.5 py-px rounded font-semibold"
                    style={{ background: 'rgba(179,136,255,0.1)', color: 'var(--purple)', fontSize: 10 }}>
                    sig {entry.signalAtFlag}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock size={9} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(entry.flaggedAt)}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                {gain != null && (
                  <div className="font-mono text-sm font-bold flex items-center gap-1"
                    style={{ color: gain >= 0 ? 'var(--green)' : 'var(--pink)' }}>
                    <TrendingUp size={11} />
                    {gain >= 0 ? '+' : ''}{gain}%
                  </div>
                )}
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>since flag</div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs mt-2.5 text-center" style={{ color: 'var(--text-muted)' }}>
        Tokens flagged FIRE/HOT · 72h window · Not financial advice
      </p>
    </div>
  );
}
