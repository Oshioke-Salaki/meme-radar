'use client';

import { useEffect, useState } from 'react';

export interface ToastMsg {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  body?: string;
}

const TYPE_META = {
  success: { icon: '✓', color: 'var(--green)',  bg: 'var(--green-soft)',  border: 'rgba(0,230,118,0.25)' },
  info:    { icon: 'ℹ', color: 'var(--blue)',   bg: 'var(--blue-soft)',   border: 'rgba(64,196,255,0.25)' },
  warning: { icon: '⚠', color: 'var(--yellow)', bg: 'var(--yellow-soft)', border: 'rgba(255,202,40,0.25)' },
  error:   { icon: '✕', color: 'var(--pink)',   bg: 'var(--pink-soft)',   border: 'rgba(255,64,129,0.25)' },
};

interface Props {
  toasts: ToastMsg[];
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: { toast: ToastMsg; onRemove: () => void }) {
  const meta = TYPE_META[toast.type];
  useEffect(() => {
    const t = setTimeout(onRemove, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="animate-slide-right flex items-start gap-3 px-4 py-3 rounded-xl"
      style={{ background: meta.bg, border: `1px solid ${meta.border}`, backdropFilter: 'blur(12px)', minWidth: 280, maxWidth: 360, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
      <span className="font-bold text-base flex-shrink-0 mt-0.5" style={{ color: meta.color }}>{meta.icon}</span>
      <div className="flex-1">
        <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{toast.title}</div>
        {toast.body && <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{toast.body}</div>}
      </div>
      <button onClick={onRemove} className="text-xs mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>✕</button>
    </div>
  );
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={() => onRemove(t.id)} />
      ))}
    </div>
  );
}
