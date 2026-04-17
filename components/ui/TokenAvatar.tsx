'use client';

import { useState } from 'react';

interface Props {
  emoji: string;
  color: string;
  imageUrl?: string;
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function TokenAvatar({ emoji, color, imageUrl, name, size = 36, className = '', style }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const radius = Math.round(size * 0.28);

  if (imageUrl && !imgFailed) {
    return (
      <img
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className={`flex-shrink-0 object-cover ${className}`}
        style={{ borderRadius: radius, width: size, height: size, border: `1px solid ${color}28`, ...style }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size, height: size,
        background: `${color}14`,
        border: `1px solid ${color}28`,
        borderRadius: radius,
        fontSize: Math.round(size * 0.48),
        lineHeight: 1,
        ...style,
      }}
    >
      {emoji}
    </div>
  );
}
