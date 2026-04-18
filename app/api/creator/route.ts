import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export interface CreatorToken {
  address: string;
  name: string;
  ticker: string;
  progress: number;         // 0–1
  graduated: boolean;
  priceUsd: string;
  day1Increase?: string;    // decimal e.g. "0.35" = +35%
  createDate: number;
}

export interface CreatorStats {
  total: number;
  graduated: number;
  avgDay1Pct: number | null; // avg 24h price change across graduated tokens
  tokens: CreatorToken[];
}

async function fetchByCreator(userAddress: string): Promise<CreatorToken[]> {
  // Four.meme ranking API filtered by userAddress
  const body = { type: 'CAP', pageNo: 1, pageSize: 100, userAddress };
  try {
    const res = await fetch('https://four.meme/meme-api/v1/public/token/ranking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://four.meme',
        'Referer': 'https://four.meme/en',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      const items: any[] = json.data || [];
      // Filter to this creator if API didn't filter server-side
      return items
        .filter(t => (t.userAddress || '').toLowerCase() === userAddress.toLowerCase())
        .map(t => ({
          address: (t.tokenAddress || '').toLowerCase(),
          name: t.name || '',
          ticker: (t.shortName || t.name || '').toUpperCase().slice(0, 10),
          progress: Math.min(1, parseFloat(t.progress || '0') || 0),
          graduated: parseFloat(t.progress || '0') >= 1 || t.status === 'TRADE',
          priceUsd: t.price || '0',
          day1Increase: t.day1Increase,
          createDate: parseInt(t.createDate || '0', 10),
        }));
    }
  } catch { /* fall through */ }

  // Fallback: search NEW ranking for this creator
  try {
    const res2 = await fetch('https://four.meme/meme-api/v1/public/token/ranking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://four.meme',
        'Referer': 'https://four.meme/en',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({ type: 'NEW', pageNo: 1, pageSize: 100 }),
      cache: 'no-store',
    });
    if (res2.ok) {
      const j2 = await res2.json();
      return (j2.data || [])
        .filter((t: any) => (t.userAddress || '').toLowerCase() === userAddress.toLowerCase())
        .map((t: any) => ({
          address: (t.tokenAddress || '').toLowerCase(),
          name: t.name || '',
          ticker: (t.shortName || t.name || '').toUpperCase().slice(0, 10),
          progress: Math.min(1, parseFloat(t.progress || '0') || 0),
          graduated: parseFloat(t.progress || '0') >= 1,
          priceUsd: t.price || '0',
          day1Increase: t.day1Increase,
          createDate: parseInt(t.createDate || '0', 10),
        }));
    }
  } catch { /* ignore */ }

  return [];
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address')?.toLowerCase();
  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  const tokens = await fetchByCreator(address);

  const graduated = tokens.filter(t => t.graduated).length;
  const withIncrease = tokens.filter(t => t.day1Increase != null);
  const avgDay1Pct = withIncrease.length > 0
    ? Math.round(withIncrease.reduce((s, t) => s + parseFloat(t.day1Increase!) * 100, 0) / withIncrease.length)
    : null;

  const stats: CreatorStats = { total: tokens.length, graduated, avgDay1Pct, tokens };
  return NextResponse.json(stats);
}
