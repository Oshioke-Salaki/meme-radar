'use client';
import { useState, useRef } from 'react';

interface Props {
  text: string;
  children: React.ReactNode;
}

export default function Tooltip({ text, children }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="tooltip-root"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && <span className="tooltip-box animate-fade-in">{text}</span>}
    </span>
  );
}
