'use client';

import { useEffect, useState } from 'react';
import { Token } from '@/lib/types';

interface SavedAlert { id: string; ticker: string; emoji: string; threshold: number; color: string; }

interface Props {
  tokens: Token[];
  onAlert: (token: Token) => void;
}

export default function MyAlerts({ tokens, onAlert }: Props) {
  const [alerts, setAlerts] = useState<SavedAlert[]>([]);

  useEffect(() => {
    const load = () => {
      const raw = localStorage.getItem('memeradar_alerts');
      setAlerts(raw ? JSON.parse(raw) : []);
    };
    load();
    window.addEventListener('storage', load);
    const t = setInterval(load, 2000);
    return () => { window.removeEventListener('storage', load); clearInterval(t); };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="card">
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>My Alerts</div>
          <span className="font-mono text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--yellow-soft)', color: 'var(--yellow)', border: '1px solid rgba(255,202,40,0.25)' }}>
            {alerts.length} active
          </span>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {alerts.map(alert => {
          const token = tokens.find(t => t.ticker === alert.ticker);
          const reached = token && token.signal >= alert.threshold;
          return (
            <div
              key={alert.id}
              className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
              style={{ background: reached ? `${alert.color}10` : 'rgba(255,255,255,0.02)', border: `1px solid ${reached ? alert.color + '35' : 'var(--border)'}` }}
              onClick={() => token && onAlert(token)}
            >
              <span className="text-xl">{alert.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs" style={{ color: alert.color }}>${alert.ticker}</span>
                  {reached && (
                    <span className="text-xs font-bold animate-live" style={{ color: 'var(--green)' }}>REACHED</span>
                  )}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Alert at signal <strong style={{ color: 'var(--text-primary)' }}>{alert.threshold}</strong>
                  {token && (
                    <span style={{ color: 'var(--text-muted)' }}> · now {token.signal}</span>
                  )}
                </div>
                {token && (
                  <div className="signal-bar mt-1.5">
                    <div className="signal-bar-fill" style={{
                      width: `${token.signal}%`,
                      background: reached
                        ? `linear-gradient(90deg, ${alert.color}60, ${alert.color})`
                        : 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.2))',
                    }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
