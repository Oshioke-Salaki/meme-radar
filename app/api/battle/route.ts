import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const runtime = 'nodejs';

export interface BattleResult {
  winner: 'token1' | 'token2';
  margin: 'DECISIVE' | 'CLOSE';
  reason: string;
  token1Score: number;
  token2Score: number;
  token1Edge: string;
  token2Edge: string;
}

export async function POST(req: NextRequest) {
  try {
    const { token1, token2 } = await req.json();
    if (!token1 || !token2) return NextResponse.json({ error: 'Two tokens required' }, { status: 400 });

    const fmt = (t: any) =>
      `$${t.ticker} (${t.name}) — Signal ${t.signal}/100 · ${t.tier} · Age: ${t.age} · Bonding: ${t.bondingCurveProgress}% · Buys 1h: ${t.buys1h} · Sells 1h: ${t.sells1h} · 24h change: ${t.priceChange24h >= 0 ? '+' : ''}${t.priceChange24h.toFixed(1)}% · 1h change: ${t.priceChange1h >= 0 ? '+' : ''}${t.priceChange1h.toFixed(1)}% · Mcap: ${t.marketCap} · Listed on DEX: ${t.listedOnDex} · AI scored: ${t.aiScored}${t.rugRisk ? ` · Rug risk: ${t.rugRisk.level} (${t.rugRisk.score})` : ''}`;

    const prompt = `You are a brutal, no-nonsense meme token analyst. Two traders are arguing about which token is the better play RIGHT NOW.

TOKEN 1: ${fmt(token1)}
TOKEN 2: ${fmt(token2)}

Pick a winner. Be decisive. Consider: signal strength, momentum velocity, bonding curve position, buy pressure, rug risk, age/freshness, and catalysts.

Respond ONLY raw JSON, no markdown:
{"winner":"token1","margin":"DECISIVE","reason":"One punchy sentence explaining why the winner is the better trade right now. Mention specific numbers.","token1Score":78,"token2Score":61,"token1Edge":"What token1 has going for it in one short phrase","token2Edge":"What token2 has going for it in one short phrase"}`;

    let raw = '{';
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: 'You are a crypto analyst. Respond only with raw JSON. No markdown.',
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
    if (!match) return NextResponse.json({ error: 'Parse error' }, { status: 500 });

    const result: BattleResult = JSON.parse(match[0]);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
