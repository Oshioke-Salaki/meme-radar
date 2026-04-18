'use client';

import { useState } from 'react';
import { Swords, Loader, Trophy } from 'lucide-react';
import { Token } from '@/lib/types';
import TokenAvatar from '@/components/ui/TokenAvatar';
import type { BattleResult } from '@/app/api/battle/route';

interface Props {
  token1: Token;
  allTokens: Token[];
}

export default function TokenBattle({ token1, allTokens }: Props) {
  const [open, setOpen] = useState(false);
  const [challenger, setChallenger] = useState<Token | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BattleResult | null>(null);

  const others = allTokens.filter(t => t.id !== token1.id).slice(0, 20);

  const runBattle = async () => {
    if (!challenger) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token1, token2: challenger }),
      });
      const data: BattleResult = await res.json();
      setResult(data);
    } catch { /* keep null */ }
    setLoading(false);
  };

  const reset = () => { setResult(null); setChallenger(null); setOpen(false); };

  const winner = result ? (result.winner === 'token1' ? token1 : challenger!) : null;
  const loser = result ? (result.winner === 'token1' ? challenger! : token1) : null;
  const winnerScore = result ? (result.winner === 'token1' ? result.token1Score : result.token2Score) : 0;
  const loserScore = result ? (result.winner === 'token1' ? result.token2Score : result.token1Score) : 0;

  if (!open) {
    return (
      <button
        className="btn btn-ghost flex items-center gap-1.5"
        style={{ fontSize: 13 }}
        onClick={() => setOpen(true)}
        title="Battle two tokens — Claude picks the winner">
        <Swords size={13} /> vs
      </button>
    );
  }

  return (
    <div className="rounded-xl mt-3 p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Swords size={13} style={{ color: 'var(--purple)' }} />
        <span className="text-xs font-bold" style={{ color: 'var(--purple)' }}>Token Battle — Claude picks a winner</span>
        <button className="ml-auto text-xs" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={reset}>✕</button>
      </div>

      {/* Fighter row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Token 1 */}
        <div className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg"
          style={{ background: `${token1.color}08`, border: `1px solid ${token1.color}25` }}>
          <TokenAvatar color={token1.color} imageUrl={token1.imageUrl} name={token1.name} ticker={token1.ticker} size={28} />
          <div>
            <div className="font-mono text-xs font-bold" style={{ color: token1.color }}>${token1.ticker}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>sig {token1.signal}</div>
          </div>
        </div>

        <span className="font-bold text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>VS</span>

        {/* Token 2 picker */}
        {!challenger ? (
          <div className="flex-1">
            <select
              className="w-full text-xs px-2 py-2 rounded-lg outline-none"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}
              value=""
              onChange={e => {
                const t = others.find(x => x.id === e.target.value);
                if (t) setChallenger(t);
              }}>
              <option value="" disabled>Pick challenger…</option>
              {others.map(t => (
                <option key={t.id} value={t.id}>${t.ticker} — sig {t.signal} ({t.tier})</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg"
            style={{ background: `${challenger.color}08`, border: `1px solid ${challenger.color}25` }}>
            <TokenAvatar color={challenger.color} imageUrl={challenger.imageUrl} name={challenger.name} ticker={challenger.ticker} size={28} />
            <div className="flex-1">
              <div className="font-mono text-xs font-bold" style={{ color: challenger.color }}>${challenger.ticker}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>sig {challenger.signal}</div>
            </div>
            {!result && !loading && (
              <button className="text-xs" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setChallenger(null)}>✕</button>
            )}
          </div>
        )}
      </div>

      {/* Result */}
      {result && winner && loser ? (
        <div className="rounded-lg p-3" style={{ background: `${winner.color}06`, border: `1px solid ${winner.color}25` }}>
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={14} style={{ color: '#f0b90b' }} />
            <span className="font-bold text-sm" style={{ color: winner.color }}>
              Claude picks ${winner.ticker}
            </span>
            <span className="text-xs px-2 py-px rounded font-mono ml-auto"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
              {winnerScore} vs {loserScore}
            </span>
          </div>
          <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
            {result.reason}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded px-2.5 py-1.5" style={{ background: `${winner.color}10`, border: `1px solid ${winner.color}20` }}>
              <div className="text-xs font-semibold" style={{ color: winner.color }}>✓ ${winner.ticker}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {result.winner === 'token1' ? result.token1Edge : result.token2Edge}
              </div>
            </div>
            <div className="rounded px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>${loser.ticker}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {result.winner === 'token1' ? result.token2Edge : result.token1Edge}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {result.margin === 'DECISIVE' ? '💪 Decisive win' : '⚡ Close call'}
            </span>
            <button className="ml-auto text-xs btn btn-ghost py-1 px-2.5" onClick={reset}>New battle</button>
          </div>
        </div>
      ) : (
        <button
          className="w-full btn btn-primary flex items-center justify-center gap-2 py-2.5"
          disabled={!challenger || loading}
          onClick={runBattle}
          style={{ opacity: !challenger ? 0.5 : 1 }}>
          {loading ? <><Loader size={13} className="animate-spin" /> Claude is thinking…</> : <><Swords size={13} /> Fight!</>}
        </button>
      )}
    </div>
  );
}
