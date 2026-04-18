'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';

interface AccuracyData {
  total: number;
  wentUp: number;
  pct: number | null;
}

export default function AccuracyBadge() {
  const [data, setData] = useState<AccuracyData | null>(null);

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data || data.total < 3 || data.pct === null) return null;

  const good = data.pct >= 60;

  return (
    <Tooltip text={`Over the last 48h, ${data.wentUp}/${data.total} FIRE & HOT signals went up ≥5% within 1 hour of being flagged.`}>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full cursor-help"
        style={{
          background: good ? 'rgba(0,230,118,0.08)' : 'rgba(255,64,129,0.08)',
          border: `1px solid ${good ? 'rgba(0,230,118,0.25)' : 'rgba(255,64,129,0.25)'}`,
        }}>
        <TrendingUp size={11} style={{ color: good ? 'var(--green)' : 'var(--pink)' }} />
        <span className="font-mono text-xs font-bold" style={{ color: good ? 'var(--green)' : 'var(--pink)' }}>
          {data.pct}%
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          accuracy ({data.wentUp}/{data.total}) ⓘ
        </span>
      </div>
    </Tooltip>
  );
}
