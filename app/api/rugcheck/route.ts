import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const runtime = 'nodejs';

export interface RugRisk {
  score: number;
  level: 'SAFE' | 'CAUTION' | 'DANGER';
  summary: string;
}

interface TokenInput {
  address: string;
  ticker: string;
  buys1h: number;
  sells1h: number;
  bondingCurveProgress: number;
  listedOnDex: boolean;
  priceChange1h: number;
  ageHours: number;
  hasSocials: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { tokens }: { tokens: TokenInput[] } = await req.json();
    if (!tokens?.length) return NextResponse.json({ scores: {} });

    const tokenList = tokens.slice(0, 30).map(t => {
      const sellRatio = t.buys1h + t.sells1h > 0
        ? Math.round((t.sells1h / (t.buys1h + t.sells1h)) * 100)
        : 50;
      return `${t.address}|$${t.ticker}|age:${t.ageHours.toFixed(1)}h|buys1h:${t.buys1h}|sells1h:${t.sells1h}|sell%:${sellRatio}|bonding:${t.bondingCurveProgress}%|socials:${t.hasSocials}|dex:${t.listedOnDex}|1h:${t.priceChange1h.toFixed(1)}%`;
    }).join('\n');

    const prompt = `You are a rug pull detection expert for Four.meme meme tokens on BNB Chain.

Analyze each token for rug/scam risk. Score 0-100:
- 0-30: SAFE — genuine community, healthy buy/sell, active bonding
- 31-60: CAUTION — mixed signals, watch carefully
- 61-100: DANGER — rug indicators: dump pattern, no socials, abandoned curve, serial fake pumps

Rug signals: sells > buys AND no socials, bonding stalled at mid-% for age > 6h, price up 50%+ then flat/down (exit pump), token < 1h old with no socials.
Positive signals: active buys, hasSocials, fast bonding progress, graduated to DEX.

TOKENS (format: address|ticker|age|buys1h|sells1h|sell%|bonding|socials|dex|1h_change):
${tokenList}

Respond ONLY raw JSON, no markdown, no code fences:
{"scores":{"0xADDR":{"score":22,"level":"SAFE","summary":"Strong buy pressure, socials present, 68% bonded"}}}`;

    let raw = '{';
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      system: 'Respond only with raw JSON starting with { and ending with }. No markdown.',
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: '{' },
      ],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        raw += chunk.delta.text;
      }
    }

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ scores: {} });

    const parsed = JSON.parse(match[0]);
    const scores: Record<string, RugRisk> = {};
    for (const [addr, val] of Object.entries(parsed.scores || {})) {
      const v = val as any;
      const score = Math.max(0, Math.min(100, Number(v.score) || 0));
      scores[addr.toLowerCase()] = {
        score,
        level: score <= 30 ? 'SAFE' : score <= 60 ? 'CAUTION' : 'DANGER',
        summary: String(v.summary || ''),
      };
    }

    return NextResponse.json({ scores });
  } catch (err) {
    return NextResponse.json({ scores: {}, error: String(err) });
  }
}
