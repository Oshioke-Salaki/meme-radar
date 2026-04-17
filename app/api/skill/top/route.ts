import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chain = searchParams.get('chain') || 'bsc';
  const limit = Math.min(Number(searchParams.get('limit') || '5'), 20);
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';

  try {
    const res = await fetch(`${protocol}://${host}/api/tokens?chain=${chain}`);
    const { tokens } = await res.json();
    const top = (tokens || []).slice(0, limit).map((t: any) => ({
      ticker: t.ticker,
      name: t.name,
      chain: t.chain,
      signal: t.signal,
      tier: t.tier,
      priceChange24h: t.priceChange24h,
      marketCap: t.marketCap,
      volume24h: t.volume24h,
      fourMemeUrl: t.fourMemeUrl,
      recommendation: t.signal >= 75 ? 'BUY' : t.signal >= 50 ? 'WATCH' : 'AVOID',
    }));
    return NextResponse.json({ chain, tokens: top, count: top.length, updatedAt: Date.now() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
