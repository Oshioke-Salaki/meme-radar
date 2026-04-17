'use client';

import { useState, useEffect } from 'react';
import { Token } from '@/lib/types';

interface SavedAlert { id: string; ticker: string; emoji: string; threshold: number; color: string; }

interface Props {
  token: Token;
  onClose: () => void;
  onSaved?: () => void;
}

export default function AlertModal({ token, onClose, onSaved }: Props) {
  const [threshold, setThreshold] = useState(Math.min(token.signal + 5, 99));
  const [saved, setSaved] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    const alerts: SavedAlert[] = JSON.parse(localStorage.getItem('memeradar_alerts') || '[]');
    setHasExisting(alerts.some(a => a.ticker === token.ticker));
  }, [token.ticker]);

  const save = () => {
    const alerts: SavedAlert[] = JSON.parse(localStorage.getItem('memeradar_alerts') || '[]');
    const filtered = alerts.filter(a => a.ticker !== token.ticker);
    const newAlert: SavedAlert = { id: Date.now().toString(), ticker: token.ticker, emoji: token.emoji, threshold, color: token.color };
    localStorage.setItem('memeradar_alerts', JSON.stringify([...filtered, newAlert]));
    setSaved(true);
    onSaved?.();
    setTimeout(onClose, 1400);
  };

  const remove = () => {
    const alerts: SavedAlert[] = JSON.parse(localStorage.getItem('memeradar_alerts') || '[]');
    localStorage.setItem('memeradar_alerts', JSON.stringify(alerts.filter(a => a.ticker !== token.ticker)));
    onClose();
  };

  const hint = threshold >= 80
    ? '🔥 High-priority — you will be notified when this token hits viral territory.'
    : threshold >= 60
    ? '⚡ Good threshold. You will be notified while there is still time to act.'
    : '📡 Early alert. You will get notified as soon as momentum builds.';

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="card animate-pop-in" style={{ width: 400, border: `1px solid ${token.color}45` }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${token.color}, transparent)`, borderRadius: '14px 14px 0 0' }} />
        <div className="p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: `${token.color}18`, border: `1px solid ${token.color}30` }}>
                {token.emoji}
              </div>
              <div>
                <div className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Signal Alert</div>
                <div className="font-mono text-sm" style={{ color: token.color }}>${token.ticker} — {token.name}</div>
              </div>
            </div>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={onClose}>✕</button>
          </div>

          {saved ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔔</div>
              <div className="font-bold text-lg mb-1" style={{ color: 'var(--green)' }}>Alert saved!</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                We will flag <strong style={{ color: token.color }}>${token.ticker}</strong> when its signal score reaches <strong style={{ color: 'var(--text-primary)' }}>{threshold}</strong>.
              </div>
            </div>
          ) : (
            <>
              {/* Current score */}
              <div className="flex items-center justify-between mb-4 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <div>
                  <div className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Current signal score</div>
                  <div className="font-bold font-mono text-2xl" style={{ color: token.color }}>{token.signal}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Your alert threshold</div>
                  <div className="font-bold font-mono text-2xl" style={{ color: 'var(--text-primary)' }}>{threshold}</div>
                </div>
              </div>

              {/* Slider */}
              <div className="mb-4">
                <label className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Alert me when signal reaches:
                  </span>
                  <span className="font-mono font-bold text-lg" style={{ color: token.color }}>{threshold}</span>
                </label>
                <input
                  type="range"
                  min={Math.max(1, token.signal - 10)}
                  max={99}
                  value={threshold}
                  onChange={e => setThreshold(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: token.color, cursor: 'pointer' }}
                />
                <div className="flex justify-between mt-1">
                  <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>Now: {token.signal}</span>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>Max: 99</span>
                </div>
              </div>

              {/* Hint */}
              <div className="p-3 rounded-xl mb-5 text-sm" style={{ background: `${token.color}0a`, border: `1px solid ${token.color}20`, color: 'var(--text-secondary)' }}>
                {hint}
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button className="btn btn-primary flex-1" onClick={save}>
                  🔔 {hasExisting ? 'Update Alert' : 'Set Alert'}
                </button>
                {hasExisting && (
                  <button className="btn btn-danger" onClick={remove}>Remove</button>
                )}
              </div>
              <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
                Alerts are saved in your browser. No account needed.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
