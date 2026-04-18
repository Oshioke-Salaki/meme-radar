import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface Props {
  params: Promise<{ address: string }>;
}

async function fetchToken(address: string, baseUrl: string) {
  try {
    const res = await fetch(`${baseUrl}/api/tokens?chain=bsc`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const { tokens } = await res.json();
    return (tokens as any[]).find((t: any) =>
      t.address?.toLowerCase() === address.toLowerCase()
    ) || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: Props) {
  const { address } = await params;
  const baseUrl = new URL(req.url).origin;
  const token = await fetchToken(address, baseUrl);

  const name = token?.name ?? 'Unknown Token';
  const ticker = token?.ticker ?? '???';
  const signal = token?.signal ?? 0;
  const price = token?.priceUsd ? parseFloat(token.priceUsd) : 0;
  const change24h = token?.priceChange24h ?? 0;
  const marketCap = token?.marketCap ?? 'N/A';
  const tier = token?.tier ?? 'COLD';
  const color = token?.color ?? '#00e676';
  const narrative = token?.narratives?.[0] ?? '';

  const tierLabel: Record<string, string> = { FIRE: 'ON FIRE', HOT: 'HOT', WARM: 'WARM', COLD: 'COOLING' };
  const priceStr = price > 0
    ? (price < 0.000001 ? price.toExponential(2) : price < 0.01 ? price.toFixed(7) : price.toFixed(4))
    : '—';

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 630,
          background: 'linear-gradient(135deg, #07070f 0%, #0d0d1a 50%, #07070f 100%)',
          display: 'flex', flexDirection: 'column', padding: '60px 80px',
          fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 500, height: 500, borderRadius: '50%',
          background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        }} />

        {/* Top row: MemeRadar brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #00e676, #40c4ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 900, color: '#000',
          }}>M</div>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>
            Meme<span style={{ color: '#00e676' }}>Radar</span>
          </span>
          <span style={{ fontSize: 14, color: '#555', marginLeft: 8 }}>· BNB Chain Signal Scanner</span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, gap: 60, alignItems: 'center' }}>
          {/* Left: token info */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Tier badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: `${color}20`, border: `1px solid ${color}50`,
              borderRadius: 8, padding: '6px 14px', width: 'fit-content',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: 1 }}>
                {tierLabel[tier]}
              </span>
            </div>

            {/* Token name */}
            <div>
              <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>
                {name.length > 18 ? name.slice(0, 18) + '…' : name}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'monospace' }}>
                ${ticker}
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 32, marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Price</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>${priceStr}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>24h Change</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: change24h >= 0 ? '#00e676' : '#ff4081', fontFamily: 'monospace' }}>
                  {change24h >= 0 ? '+' : ''}{change24h.toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>Market Cap</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{marketCap}</div>
              </div>
            </div>

            {narrative && (
              <div style={{
                background: `${color}12`, border: `1px solid ${color}30`,
                borderRadius: 8, padding: '8px 14px', marginTop: 4,
                fontSize: 14, color: color, fontWeight: 600,
              }}>
                {narrative}
              </div>
            )}
          </div>

          {/* Right: Signal score */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: `${color}08`, border: `2px solid ${color}30`,
            borderRadius: 20, padding: '40px 50px', minWidth: 200,
          }}>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 8, letterSpacing: 2, fontWeight: 600 }}>
              SIGNAL
            </div>
            <div style={{
              fontSize: 100, fontWeight: 900, lineHeight: 1,
              color, fontFamily: 'monospace',
              textShadow: `0 0 60px ${color}60`,
            }}>
              {signal}
            </div>
            <div style={{ fontSize: 16, color: '#555', marginTop: 4 }}>/ 100</div>

            {/* Signal bar */}
            <div style={{
              width: 120, height: 6, background: '#1a1a2e', borderRadius: 3,
              marginTop: 16, overflow: 'hidden',
            }}>
              <div style={{
                width: `${signal}%`, height: '100%', borderRadius: 3,
                background: `linear-gradient(90deg, ${color}80, ${color})`,
              }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
          <span style={{ fontSize: 13, color: '#444' }}>
            {address.slice(0, 10)}…{address.slice(-6)}
          </span>
          <span style={{ fontSize: 13, color: '#444' }}>
            memeradar.xyz · Not financial advice
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
