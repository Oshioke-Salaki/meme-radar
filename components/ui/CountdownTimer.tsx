'use client';

import { useState, useEffect } from 'react';

interface Props {
  minutes: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function CountdownTimer({ minutes, className, style }: Props) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.round(minutes * 60)));

  // Reset when ETA changes by more than 2 minutes (new data refresh)
  useEffect(() => {
    const fresh = Math.max(0, Math.round(minutes * 60));
    setSecs(prev => Math.abs(prev - fresh) > 120 ? fresh : prev);
  }, [Math.round(minutes / 2)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (secs === 0) return;
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secs === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (secs === 0) return <span className={className} style={style}>Graduating…</span>;

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  const str = h > 0
    ? `${h}h ${m}m ${s.toString().padStart(2, '0')}s`
    : `${m}m ${s.toString().padStart(2, '0')}s`;

  return <span className={className} style={style}>{str}</span>;
}
