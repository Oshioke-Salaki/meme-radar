import { NextRequest, NextResponse } from 'next/server';
import { calcSignal, getTier, getRisk, formatAge, formatMarketCap, blipPosition, tokenEmoji, tokenColor, extractNarratives } from '@/lib/signalEngine';
import { Token, Chain } from '@/lib/types';
import type { FourMemeToken } from '@/app/api/fourmeme/route';
import { recordFireTokens, seedHistoryFromTokens } from '@/lib/signalHistory';

export const runtime = 'nodejs';

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

async function fetchFourMemeIndex(): Promise<Record<string, FourMemeToken>> {
  try {
    const res = await fetch('https://four.meme/meme-api/v1/public/token/ranking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://four.meme', 'Referer': 'https://four.meme/en', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ type: 'CAP', pageNo: 1, pageSize: 100 }),
      next: { revalidate: 30 },
    });
    if (!res.ok) return {};
    const json = await res.json();
    const tokens: any[] = json.data || [];
    const index: Record<string, FourMemeToken> = {};
    for (const t of tokens) {
      const addr = (t.tokenAddress || '').toLowerCase();
      if (!addr) continue;
      const progress = Math.min(1, parseFloat(t.progress || '0') || 0);
      index[addr] = {
        tokenAddress: addr,
        name: t.name || '',
        shortName: t.shortName || '',
        userAddress: t.userAddress || '',
        img: t.img || '',
        imageUrl: t.img ? `https://four.meme${t.img}` : '',
        progress,
        bondingCurveBnb: parseFloat((progress * 24).toFixed(3)),
        price: t.price || '0',
        cap: t.cap || t.capUSDT || '0',
        day1Vol: t.day1Vol || t.day1VolUSDT,
        hourVol: t.hourVol,
        createDate: parseInt(t.createDate || '0', 10),
        status: t.status || 'UNKNOWN',
        tag: t.tag || '',
        day1Increase: t.day1Increase,
        hourIncrease: t.hourIncrease,
      };
    }
    // Also fetch NEW tokens for bonding curve tokens not in CAP ranking
    try {
      const res2 = await fetch('https://four.meme/meme-api/v1/public/token/ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'https://four.meme', 'Referer': 'https://four.meme/en', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ type: 'NEW', pageNo: 1, pageSize: 100 }),
        next: { revalidate: 30 },
      });
      if (res2.ok) {
        const j2 = await res2.json();
        for (const t of (j2.data || [])) {
          const addr = (t.tokenAddress || '').toLowerCase();
          if (!addr || index[addr]) continue;
          const progress = Math.min(1, parseFloat(t.progress || '0') || 0);
          index[addr] = {
            tokenAddress: addr, name: t.name || '', shortName: t.shortName || '',
            userAddress: t.userAddress || '', img: t.img || '',
            imageUrl: t.img ? `https://four.meme${t.img}` : '',
            progress, bondingCurveBnb: parseFloat((progress * 24).toFixed(3)),
            price: t.price || '0', cap: t.cap || '0',
            createDate: parseInt(t.createDate || '0', 10),
            status: t.status || 'UNKNOWN', tag: t.tag || '',
          };
        }
      }
    } catch { /* ignore new-token fetch failure */ }
    return index;
  } catch {
    return {};
  }
}

function mapPairToToken(pair: any, chain: Chain, fourMemeIndex: Record<string, FourMemeToken> = {}): Token | null {
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
    const avgBuysPerHour = buys24h / 24;
    const velocityDelta = Math.round(buysH1 - avgBuysPerHour);

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
    const twitterUrl = socials.find(s => s.type === 'twitter')?.url;
    const telegramUrl = socials.find(s => s.type === 'telegram')?.url;
    const websiteUrl = websites[0]?.url;

    // Look up Four.meme enrichment data
    const fm = fourMemeIndex[(base.address || '').toLowerCase()];
    // Proxy Four.meme images through our edge route to bypass CDN hotlink protection
    const proxyImg = (u?: string) => u ? `/api/img?url=${encodeURIComponent(u)}` : undefined;
    const imageUrl: string | undefined = proxyImg(fm?.imageUrl) ?? info.imageUrl ?? undefined;
    // Use Four.meme's exact progress (0–1 scale) converted to %
    const fmBondingProgress = fm ? Math.round(fm.progress * 100) : bondingCurveProgress;
    const fmBondingBnb = fm?.bondingCurveBnb;
    const creatorAddress = fm?.userAddress;
    const fourMemeStatus = fm?.status;
    const fourMemeTag = fm?.tag;
    // Use Four.meme creation date if available (more accurate)
    const actualCreatedAt = (fm?.createDate && fm.createDate > 0) ? fm.createDate : createdAt;

    // Graduation predictor: estimate minutes to 24 BNB based on bonding curve velocity
    let timeToGradMinutes: number | undefined;
    if (isFourMeme && fmBondingProgress < 100 && fm && fm.createDate > 0 && fm.progress > 0.02) {
      const ageHrs = (Date.now() - fm.createDate) / 3_600_000;
      if (ageHrs > 0.1) {
        const baseVelocity = fm.progress / Math.max(ageHrs, 0.25); // progress/hr lifetime avg
        let recentFactor = 1.0;
        if (fm.hourVol && fm.day1Vol) {
          const hourV = parseFloat(fm.hourVol);
          const dayV = parseFloat(fm.day1Vol);
          const avgHourlyVol = dayV / Math.min(ageHrs, 24);
          if (avgHourlyVol > 0 && hourV > 0) {
            recentFactor = Math.min(Math.max(hourV / avgHourlyVol, 0.1), 5);
          }
        }
        const velocity = baseVelocity * (0.4 + 0.6 * recentFactor);
        const mins = Math.round(((1 - fm.progress) / velocity) * 60);
        if (mins >= 1 && mins <= 1440) timeToGradMinutes = mins;
      }
    }

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
      socialVelocity: buysH1,
      velocityDelta,
      priceUsd: pair.priceUsd || '0',
      priceChange1h: priceChangeH1,
      priceChange24h: priceChangeH24,
      volume24h: volumeH24,
      liquidity,
      marketCap: formatMarketCap(marketCap),
      fdv: pair.fdv || 0,
      buys24h, sells24h, buys1h: buysH1, sells1h: sellsH1,
      bondingCurveProgress: isFourMeme ? fmBondingProgress : bondingCurveProgress,
      listedOnDex: !isFourMeme || (isFourMeme ? fmBondingProgress >= 100 : bondingCurveProgress >= 100),
      dexName: pair.dexId || 'unknown',
      narratives: extractNarratives(base.name, ticker),
      platforms: ['X', 'TG'],
      blipX: pos.x,
      blipY: pos.y,
      age: formatAge(actualCreatedAt),
      createdAt: actualCreatedAt,
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
      creatorAddress,
      bondingCurveBnb: fmBondingBnb,
      fourMemeStatus,
      fourMemeTag,
      timeToGradMinutes,
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
    // Fetch DexScreener data + Four.meme enrichment in parallel (BSC only)
    const [results, fourMemeIndex] = await Promise.all([
      Promise.all(queries.map(fetchDexScreener)),
      chain === 'bsc' ? fetchFourMemeIndex() : Promise.resolve({} as Record<string, FourMemeToken>),
    ]);
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
      .map(p => mapPairToToken(p, chain, fourMemeIndex))
      .filter((t): t is Token => t !== null)
      .sort((a, b) => b.signal - a.signal)
      .slice(0, 30);

    // Record FIRE/HOT tokens for historical accuracy tracking
    try {
      const fireHot = tokens.filter(t => t.tier === 'FIRE' || t.tier === 'HOT').map(t => ({
        address: t.address, ticker: t.ticker, name: t.name,
        chain: t.chain, signal: t.signal, priceUsd: t.priceUsd, tier: t.tier,
        listedOnDex: t.listedOnDex,
      }));
      // Seed on first run so accuracy badge has data immediately
      seedHistoryFromTokens(tokens.map(t => ({
        address: t.address, ticker: t.ticker, name: t.name, chain: t.chain,
        signal: t.signal, priceUsd: t.priceUsd, tier: t.tier,
        priceChange24h: t.priceChange24h, priceChange1h: t.priceChange1h,
        createdAt: t.createdAt,
      })));
      recordFireTokens(fireHot);
    } catch { /* don't let history errors break the response */ }

    return NextResponse.json({ tokens, updatedAt: Date.now() });
  } catch (err) {
    return NextResponse.json({ tokens: [], error: String(err) }, { status: 500 });
  }
}
