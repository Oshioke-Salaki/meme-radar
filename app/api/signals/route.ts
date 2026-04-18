import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const client = new Anthropic();

interface TokenInput {
  address: string;
  name: string;
  ticker: string;
  bondingCurveProgress: number;
  buys1h: number;
  sells1h: number;
  buys24h: number;
  sells24h: number;
  priceChange1h: number;
  priceChange24h: number;
  ageHours: number;
  marketCap: string;
  liquidity: number;
  volume24h: number;
  fourMemeStatus?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { tokens } = await req.json() as { tokens: TokenInput[] };
    if (!tokens?.length) return NextResponse.json({ scores: {} });

    const tokenList = tokens.slice(0, 20).map(t => {
      const totalH1 = t.buys1h + t.sells1h;
      const buyRatio = totalH1 > 0 ? Math.round((t.buys1h / totalH1) * 100) : 50;
      return `${t.address}|${t.ticker}|age:${t.ageHours.toFixed(1)}h|bonding:${t.bondingCurveProgress}%|buys1h:${t.buys1h}|sells1h:${t.sells1h}|buyRatio:${buyRatio}%|p1h:${t.priceChange1h > 0 ? '+' : ''}${t.priceChange1h}%|p24h:${t.priceChange24h > 0 ? '+' : ''}${t.priceChange24h}%|mcap:${t.marketCap}|vol24h:${Math.round(t.volume24h)}|status:${t.fourMemeStatus || 'TRADE'}`;
    }).join('\n');

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are a meme token signal analyst for the Four.meme launchpad on BNB Chain. Score each token 0–100 for viral potential RIGHT NOW.

Scoring rules:
- Bonding curve >80% + buys1h >20 = near graduation = very high score (85–99)
- Fresh token <2h + buy ratio >65% + bonding rising = high score (75–90)
- Strong buy ratio (>70%) + positive 1h price = add 15–20 pts
- Heavy sells (ratio <35%) or negative 1h price = subtract 15–20 pts
- Volume/mcap ratio: high vol relative to mcap = momentum signal
- Status PRESALE/INIT with low buys = subtract 10 pts
- >24h old + cooling buys = lower score

Output ONLY a JSON object mapping address to score integer. No explanation.

Tokens:
${tokenList}`,
      }],
      system: 'You output only valid JSON. No markdown, no explanation.',
    });

    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const jsonStr = text.startsWith('{') ? text : text.slice(text.indexOf('{'));
    const scores = JSON.parse(jsonStr);

    // Clamp all scores to 1–99
    for (const addr of Object.keys(scores)) {
      scores[addr] = Math.max(1, Math.min(99, Math.round(scores[addr])));
    }

    return NextResponse.json({ scores });
  } catch (err) {
    return NextResponse.json({ scores: {}, error: String(err) });
  }
}
