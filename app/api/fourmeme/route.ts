import { NextResponse } from 'next/server';

const FOURMEME_BASE = 'https://four.meme/meme-api';
const FOURMEME_IMG_BASE = 'https://four.meme';
const GRADUATION_BNB = 24;

async function fetchRanking(type: string, pageSize = 50): Promise<any[]> {
  const body: Record<string, unknown> = { type, pageNo: 1, pageSize };
  if (type === 'DayTrading') { body.type = 'VOL'; body.rankingKind = 'DayTrading'; }
  try {
    const res = await fetch(`${FOURMEME_BASE}/v1/public/token/ranking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://four.meme', 'Referer': 'https://four.meme/en', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify(body),
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export interface FourMemeToken {
  tokenAddress: string;
  name: string;
  shortName: string;
  userAddress: string;       // creator wallet
  img: string;               // image path, prepend FOURMEME_IMG_BASE
  imageUrl: string;          // full URL
  progress: number;          // 0–1 (multiply by 100 for %)
  bondingCurveBnb: number;   // BNB raised = progress * GRADUATION_BNB
  price: string;
  cap: string;               // market cap in USD
  day1Vol?: string;
  hourVol?: string;
  createDate: number;        // unix ms
  status: string;            // INIT | PRESALE | TRADE
  tag: string;
  day1Increase?: string;     // 24h price change as decimal (e.g. "0.05" = +5%)
  hourIncrease?: string;
}

function mapToken(raw: any): FourMemeToken {
  const progress = Math.min(1, parseFloat(raw.progress || '0') || 0);
  return {
    tokenAddress: (raw.tokenAddress || '').toLowerCase(),
    name: raw.name || '',
    shortName: raw.shortName || '',
    userAddress: raw.userAddress || '',
    img: raw.img || '',
    imageUrl: raw.img ? `${FOURMEME_IMG_BASE}${raw.img}` : '',
    progress,
    bondingCurveBnb: parseFloat((progress * GRADUATION_BNB).toFixed(3)),
    price: raw.price || '0',
    cap: raw.cap || raw.capUSDT || '0',
    day1Vol: raw.day1Vol || raw.day1VolUSDT,
    hourVol: raw.hourVol,
    createDate: parseInt(raw.createDate || '0', 10),
    status: raw.status || 'UNKNOWN',
    tag: raw.tag || '',
    day1Increase: raw.day1Increase,
    hourIncrease: raw.hourIncrease,
  };
}

export async function GET() {
  // Fetch CAP ranking (most comprehensive) + NEW tokens (bonding curve)
  const [capTokens, newTokens] = await Promise.all([
    fetchRanking('CAP', 50),
    fetchRanking('NEW', 50),
  ]);

  const seen = new Set<string>();
  const all: FourMemeToken[] = [];
  for (const raw of [...capTokens, ...newTokens]) {
    const addr = (raw.tokenAddress || '').toLowerCase();
    if (!addr || seen.has(addr)) continue;
    seen.add(addr);
    all.push(mapToken(raw));
  }

  // Index by token address for fast lookup
  const byAddress: Record<string, FourMemeToken> = {};
  for (const t of all) byAddress[t.tokenAddress] = t;

  return NextResponse.json({ tokens: all, byAddress, updatedAt: Date.now() });
}
