'use client';

import { useEffect, useRef, useState } from 'react';
import { Token, CHAIN_META, Chain } from '@/lib/types';

interface Props {
  tokens: Token[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  chain: Chain;
}

const TIER_COLORS: Record<string, string> = {
  FIRE: '#00e676', HOT: '#40c4ff', WARM: '#ffd60a', COLD: '#7070a0',
};

function getCanvasCoords(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

function findClosestToken(tokens: Token[], mx: number, my: number, canvasSize: number, hitRadius = 28): string | null {
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const radius = canvasSize * 0.44;

  let closest: string | null = null;
  let closestDist = hitRadius;

  tokens.forEach(token => {
    const bx = cx + ((token.blipX / 100) * 2 - 1) * radius * 0.9;
    const by = cy + ((token.blipY / 100) * 2 - 1) * radius * 0.9;
    const dist = Math.hypot(mx - bx, my - by);
    if (dist < closestDist) { closestDist = dist; closest = token.id; }
  });
  return closest;
}

export default function RadarDisplay({ tokens, selectedId, onSelect, chain }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef  = useRef(0);
  const rafRef    = useRef<number>(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const chainMeta = CHAIN_META[chain];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const SIZE = canvas.width;
    const cx = SIZE / 2, cy = SIZE / 2;
    const radius = SIZE * 0.44;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Dark base
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(5,5,12,0.88)';
      ctx.fill();

      // Grid rings
      [0.25, 0.5, 0.75, 1].forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,230,118,${0.05 + i * 0.025})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Cross hairs
      ctx.save();
      ctx.strokeStyle = 'rgba(0,230,118,0.08)';
      ctx.setLineDash([4, 8]);
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Sweep
      const sweep = angleRef.current;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweep);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, -Math.PI * 1.1, 0);
      ctx.closePath();
      const sg = ctx.createLinearGradient(0, -radius, radius, 0);
      sg.addColorStop(0, 'rgba(0,230,118,0)');
      sg.addColorStop(0.7, 'rgba(0,230,118,0.05)');
      sg.addColorStop(1, 'rgba(0,230,118,0.12)');
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,230,118,0.75)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00e676';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(radius, 0); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Blips
      tokens.forEach(token => {
        const bx = cx + ((token.blipX / 100) * 2 - 1) * radius * 0.9;
        const by = cy + ((token.blipY / 100) * 2 - 1) * radius * 0.9;
        const color = TIER_COLORS[token.tier];
        const isSelected = token.id === selectedId;
        const isHov = token.id === hovered;
        const dotSize = isSelected ? 7 : isHov ? 6 : 4.5;

        if (isSelected || isHov) {
          ctx.beginPath();
          ctx.arc(bx, by, dotSize + 8, 0, Math.PI * 2);
          ctx.strokeStyle = color + '35';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (token.tier === 'FIRE') {
          ctx.beginPath();
          ctx.arc(bx, by, dotSize + 5, 0, Math.PI * 2);
          ctx.strokeStyle = color + '50';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(bx, by, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isSelected ? 18 : isHov ? 12 : 7;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isSelected || isHov) {
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 6;
          const lx = bx + 12, ly = by - 6;
          ctx.fillText(`$${token.ticker}`, lx, ly);
          ctx.shadowBlur = 0;
        }
      });

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,230,118,0.5)';
      ctx.fill();

      angleRef.current = (sweep + 0.007) % (Math.PI * 2);
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tokens, selectedId, hovered]);

  // ── Click handler ──
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY);
    const found = findClosestToken(tokens, x, y, canvas.width);
    if (found) onSelect(found);
  };

  // ── Touch handler ──
  const handleTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return;
    const { x, y } = getCanvasCoords(canvas, e.touches[0].clientX, e.touches[0].clientY);
    const found = findClosestToken(tokens, x, y, canvas.width, 40); // bigger radius for touch
    if (found) onSelect(found);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasCoords(canvas, e.clientX, e.clientY);
    const found = findClosestToken(tokens, x, y, canvas.width, 24);
    setHovered(found);
    canvas.style.cursor = found ? 'pointer' : 'crosshair';
  };

  const label = chainMeta?.label || 'Scanning';

  return (
    <div className="relative scanlines" style={{ borderRadius: 14, overflow: 'hidden' }}>
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,230,118,0.03) 0%, transparent 70%)', border: '1px solid rgba(0,230,118,0.1)' }} />
      <canvas
        ref={canvasRef}
        width={400} height={400}
        className="w-full h-full block"
        style={{ borderRadius: 14, touchAction: 'none' }}
        onClick={handleClick}
        onTouchStart={handleTouch}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      />
      {/* Corner brackets */}
      {[['top-2 left-2','top','left'],['top-2 right-2','top','right'],['bottom-2 left-2','bottom','left'],['bottom-2 right-2','bottom','right']].map(([pos], i) => (
        <div key={i} className={`absolute ${pos} w-4 h-4 pointer-events-none`} style={{
          borderTop:    i < 2   ? '1px solid rgba(0,230,118,0.35)' : 'none',
          borderBottom: i >= 2  ? '1px solid rgba(0,230,118,0.35)' : 'none',
          borderLeft:   i%2===0 ? '1px solid rgba(0,230,118,0.35)' : 'none',
          borderRight:  i%2===1 ? '1px solid rgba(0,230,118,0.35)' : 'none',
        }} />
      ))}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
        <span className="font-mono text-xs" style={{ color: 'rgba(0,230,118,0.4)' }}>
          SCANNING {label.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
