'use client';

import { Radio, BarChart2, Zap, Target, Bell, AlertTriangle, X, Rocket } from 'lucide-react';

interface Props { onClose: () => void; }

const STEPS = [
  { Icon: Radio,         color: 'var(--blue)',   title: 'We scan everything',       desc: 'MemeRadar monitors Twitter/X, Telegram, Reddit, and Discord 24/7 looking for meme tokens gaining buzz.' },
  { Icon: BarChart2,     color: 'var(--green)',  title: 'Signal Score (0–100)',      desc: "The higher the score, the hotter the token. A score of 80+ means it's going viral right now. Under 40 = cooling down." },
  { Icon: Zap,           color: 'var(--yellow)', title: 'Velocity = momentum',       desc: 'How many times per hour the token is being mentioned across platforms. Rising fast = early opportunity.' },
  { Icon: Target,        color: 'var(--purple)', title: 'Narratives = the story',    desc: '"Pepe Revival", "AI × Meme", "Dog Meta". Every viral token rides a narrative. Narratives drive price.' },
  { Icon: Bell,          color: 'var(--green)',  title: 'Set an alert',              desc: 'Click any token, then "Set Alert" to get notified when its signal crosses your chosen threshold.' },
  { Icon: AlertTriangle, color: 'var(--pink)',   title: 'Risk levels',               desc: 'LOW = established. MED = growing fast. HIGH = hype-driven. DEGEN = extremely new, very high risk.' },
];

export default function HowItWorks({ onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card animate-pop-in" style={{ width: 520, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--green), var(--blue))' }} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>How MemeRadar works</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Everything you need to know in 2 minutes</p>
            </div>
            <button className="btn btn-ghost flex items-center gap-1.5" onClick={onClose}>
              <X size={14} /> Close
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {STEPS.map(({ Icon, color, title, desc }, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                  <Icon size={18} color={color} strokeWidth={2} />
                </div>
                <div>
                  <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: 'var(--green-soft)', border: '1px solid rgba(0,230,118,0.2)', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--green)' }}>Important:</strong> MemeRadar shows social signals, not financial advice. Always do your own research. Meme coins are extremely volatile.
          </div>

          <button className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2" onClick={onClose}>
            <Rocket size={15} /> Got it, let&apos;s go
          </button>
        </div>
      </div>
    </div>
  );
}
