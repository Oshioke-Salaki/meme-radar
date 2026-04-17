import { NextRequest, NextResponse } from 'next/server';
import { calcSignal, getTier, getRisk, formatAge, formatMarketCap, blipPosition, tokenEmoji, tokenColor, extractNarratives } from '@/lib/signalEngine';
import { Token, Chain } from '@/lib/types';

const CHAIN_QUERIES: Record<Chain, string[]> = {
  bsc:      ['fourmeme', 'four.meme'],
  ethereum: ['meme ethereum', 'pepe ethereum'],
  base:     ['meme base'],
  solana:   ['meme solana'],
  arbitrum: ['meme arbitrum'],
};

const CHAIN_IDS: Record<Chain, string> = {
  bsc: 'bsc', ethereum: 'ethereum', base: 'base', solana: 'solana', arbitrum: 'arbitrum',
};

async function fetchDexScreener(query: string): Promise<any[]> {
  const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.pairs || [];
}

function mapPairToToken(pair: any, chain: Chain): Token | null {
  try {
    const base = pair.baseToken;
    if (!base?.name || !base?.symbol) return null;
    const createdAt = pair.pairCreatedAt || (Date.now() - 86400000);
    const ageHours = (Date.now() - createdAt) / 3_600_000;

    const txnsH1 = (pair.txns?.h1?.buys || 0) + (pair.txns?.h1?.sells || 0);
    const buysH1 = pair.txns?.h1?.buys || 0;
    const sellsH1 = pair.txns?.h1?.sells || 0;
    const buys24h = pair.txns?.h24?.buys || 0;
    const sells24h = pair.txns?.h24?.sells || 0;
    const volumeH1 = pair.volume?.h1 || 0;
    const volumeH24 = pair.volume?.h24 || 0;
    const liquidity = pair.liquidity?.usd || 0;
    const priceChangeH1 = pair.priceChange?.h1 || 0;
    const priceChangeH24 = pair.priceChange?.h24 || 0;
    const totalH1 = buysH1 + sellsH1;
    const sellsRatio = totalH1 > 0 ? sellsH1 / totalH1 : 0.5;

    const marketCap = pair.marketCap || pair.fdv || 0;
    // Use marketCap as liquidity proxy when DexScreener doesn't return liquidity (e.g. bonding curve tokens)
    const effectiveLiquidity = liquidity > 0 ? liquidity : marketCap * 0.08;

    const signal = calcSignal({
      txnsH1, txnsH24: buys24h + sells24h, volumeH1, volumeH24,
      liquidity: effectiveLiquidity, priceChangeH1, priceChangeH24, createdAt, buysH1, sellsH1,
    });

    const pos = blipPosition(base.address || pair.pairAddress);
    const ticker = base.symbol?.toUpperCase().slice(0, 10) || '???';
    const color = tokenColor(ticker);
    const emoji = tokenEmoji(chain, base.name);
    const prevTxns = Math.max(1, buysH1 - 3);
    const velocityDelta = Math.floor((buysH1 - prevTxns) * 12);

    const isFourMeme = pair.dexId === 'fourmeme' || pair.dexId?.includes('four');
    // Four.meme bonding curve graduates at ~24 BNB (~$14.4k). Use fdv as proxy.
    // DexScreener search doesn't return liquidity for fourmeme pairs, so fdv is better.
    const GRADUATION_USD = 14_500;
    const bondingCurveProgress = isFourMeme
      ? Math.min(Math.round((marketCap / GRADUATION_USD) * 100), 100)
      : 100;

    // Extract social/media info from DexScreener's info field
    const info = pair.info || {};
    const socials: { type: string; url: string }[] = info.socials || [];
    const websites: { label: string; url: string }[] = info.websites || [];
    const imageUrl: string | undefined = info.imageUrl || undefined;
    const twitterUrl = socials.find(s => s.type === 'twitter')?.url;
    const telegramUrl = socials.find(s => s.type === 'telegram')?.url;
    const websiteUrl = websites[0]?.url;

    return {
      id: base.address || pair.pairAddress,
      name: base.name,
      ticker,
      emoji,
      color,
      chain,
      address: base.address || '',
      pairAddress: pair.pairAddress || '',
      signal,
      signalDelta: Math.round(priceChangeH1 * 0.3),
      tier: getTier(signal),
      risk: getRisk({ ageHours, liquidity, sellsRatio }),
      socialVelocity: buysH1 * 14 + Math.floor(Math.random() * 50),
      velocityDelta,
      priceUsd: pair.priceUsd || '0',
      priceChange1h: priceChangeH1,
      priceChange24h: priceChangeH24,
      volume24h: volumeH24,
      liquidity,
      marketCap: formatMarketCap(marketCap),
      fdv: pair.fdv || 0,
      buys24h, sells24h, buys1h: buysH1, sells1h: sellsH1,
      bondingCurveProgress,
      listedOnDex: !isFourMeme || bondingCurveProgress >= 100,
      dexName: pair.dexId || 'unknown',
      narratives: extractNarratives(base.name, ticker),
      platforms: ['X', 'TG'],
      blipX: pos.x,
      blipY: pos.y,
      age: formatAge(createdAt),
      createdAt,
      sparkline: Array.from({ length: 11 }, (_, i) =>
        Math.max(1, Math.min(99, signal - 20 + i * 3 + Math.random() * 5))
      ).map(Math.round),
      fourMemeUrl: isFourMeme
        ? `https://four.meme/en/token/${base.address}`
        : `https://dexscreener.com/${CHAIN_IDS[chain]}/${pair.pairAddress}`,
      dexScreenerUrl: `https://dexscreener.com/${CHAIN_IDS[chain]}/${pair.pairAddress}`,
      imageUrl,
      twitterUrl,
      telegramUrl,
      websiteUrl,
    } satisfies Token;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chain = (searchParams.get('chain') || 'bsc') as Chain;

  try {
    const queries = CHAIN_QUERIES[chain] || CHAIN_QUERIES.bsc;
    const results = await Promise.all(queries.map(fetchDexScreener));
    const allPairs = results.flat();

    // Deduplicate by pairAddress
    const seen = new Set<string>();
    const unique = allPairs.filter(p => {
      if (!p.pairAddress || seen.has(p.pairAddress)) return false;
      seen.add(p.pairAddress);
      return true;
    });

    // Filter for relevant chain
    const chainId = CHAIN_IDS[chain];
    const filtered = unique.filter(p => p.chainId === chainId);

    const tokens = filtered
      .map(p => mapPairToToken(p, chain))
      .filter((t): t is Token => t !== null)
      .sort((a, b) => b.signal - a.signal)
      .slice(0, 30);

    return NextResponse.json({ tokens, updatedAt: Date.now() });
  } catch (err) {
    return NextResponse.json({ tokens: [], error: String(err) }, { status: 500 });
  }
}
