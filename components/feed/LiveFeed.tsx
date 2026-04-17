'use client';

import { FeedEvent } from '@/lib/types';

const TYPE_META: Record<FeedEvent['type'], { icon: string; label: string }> = {
  SIGNAL_UP:   { icon: '▲', label: 'Rising' },
  SIGNAL_DOWN: { icon: '▼', label: 'Falling' },
  NEW_TOKEN:   { icon: '✦', label: 'New token' },
  NARRATIVE:   { icon: '◈', label: 'Narrative' },
  ALERT:       { icon: '⚠', label: 'Alert' },
};

const PLATFORM_LABEL: Record<string, string> = {
  X: '𝕏 Twitter', TG: '✈ Telegram', Reddit: '◉ Reddit', Discord: '⬡ Discord',
};

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

interface Props { events: FeedEvent[]; }

export default function LiveFeed({ events }: Props) {
  return (
    <div className="card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Signal Feed</span>
          <span className="px-1.5 py-0.5 rounded text-xs font-bold animate-live"
            style={{ background: 'var(--green-soft)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.2)' }}>
            LIVE
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {events.length} events
        </span>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {events.map((event, i) => {
          const meta = TYPE_META[event.type];
          return (
            <div
              key={event.id}
              className="rounded-xl p-3 animate-slide-right"
              style={{
                background: `${event.color}07`,
                border: `1px solid ${event.color}18`,
                animationDelay: i === 0 ? '0ms' : '60ms',
                animationFillMode: 'both',
              }}
            >
              <div className="flex items-start gap-2.5">
                {/* Icon */}
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: `${event.color}18`, color: event.color }}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="font-bold text-xs" style={{ color: event.color }}>
                      {event.emoji} ${event.ticker}
                    </span>
                    <span className="text-xs px-1.5 py-px rounded font-semibold"
                      style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {event.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {PLATFORM_LABEL[event.platform]}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(event.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          Monitoring X · Telegram · Reddit · Discord
        </p>
      </div>
    </div>
  );
}
