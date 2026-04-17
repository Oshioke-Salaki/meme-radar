'use client';

interface Props { onClose: () => void; }

const STEPS = [
  { icon: '📡', title: 'We scan everything', desc: 'MemeRadar monitors Twitter/X, Telegram, Reddit, and Discord 24/7 looking for meme tokens gaining buzz.' },
  { icon: '📊', title: 'Signal Score (0–100)', desc: 'The higher the score, the hotter the token. A score of 80+ means it\'s going viral right now. Under 40 = cooling down.' },
  { icon: '⚡', title: 'Velocity = momentum', desc: 'How many times per hour the token is being mentioned across platforms. Rising fast = early opportunity.' },
  { icon: '🎯', title: 'Narratives = the story', desc: 'Every viral token has a narrative — "Pepe Revival", "AI × Meme", "Dog Meta". Narratives drive price.' },
  { icon: '🔔', title: 'Set an alert', desc: 'Click any token, then "Set Alert" to get notified when its signal crosses your chosen threshold.' },
  { icon: '⚠️', title: 'Risk levels', desc: 'LOW = established community. MED = growing fast. HIGH = hype-driven. DEGEN = extremely new, high risk.' },
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
            <button className="btn btn-ghost" onClick={onClose}>✕ Close</button>
          </div>

          <div className="flex flex-col gap-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {s.icon}
                </div>
                <div>
                  <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{s.title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 p-4 rounded-xl text-sm" style={{ background: 'var(--green-soft)', border: '1px solid rgba(0,230,118,0.2)', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--green)' }}>Important:</strong> MemeRadar shows social signals, not financial advice. Always do your own research before trading. Meme coins are extremely volatile.
          </div>

          <button className="btn btn-primary w-full mt-4" onClick={onClose}>
            Got it, let's go 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
