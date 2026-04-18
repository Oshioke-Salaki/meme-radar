'use client';

import { useState } from 'react';

interface Props {
  emoji?: string;
  color: string;
  imageUrl?: string;
  name: string;
  ticker?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function TokenAvatar({ color, imageUrl, name, ticker, size = 36, className = '', style }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const radius = Math.round(size * 0.28);
  const raw = (ticker || name).replace(/^\$/, '');
  const ascii = raw.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase();
  // Fallback for CJK/non-ASCII names: use first 2 printable characters
  const letters = ascii || raw.replace(/\s+/g, '').slice(0, 2) || '??';
  const fontSize = Math.round(size * 0.35);

  if (imageUrl && !imgFailed) {
    return (
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className={`shrink-0 object-cover ${className}`}
        style={{ borderRadius: radius, width: size, height: size, border: `1px solid ${color}28`, ...style }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center shrink-0 select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `${color}18`,
        border: `1px solid ${color}35`,
        borderRadius: radius,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize,
        fontWeight: 700,
        color,
        letterSpacing: '-0.03em',
        ...style,
      }}
    >
      {letters}
    </div>
  );
}
