import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface TokenInput {
  name: string;
  ticker: string;
  signal: number;
  buys1h: number;
  priceChange24h: number;
  bondingCurveProgress: number;
  narratives: string[];
}

const MOMENTUM_COLOR: Record<string, string> = {
  HIGH: '#00e676',
  MED: '#ffd60a',
  LOW: '#40c4ff',
};

export async function POST(req: NextRequest) {
  try {
    const { tokens }: { tokens: TokenInput[] } = await req.json();
    if (!tokens?.length) return NextResponse.json({ patterns: [] });

    const top = tokens.slice(0, 15);
    const tokenList = top
      .map((t, i) => `${i + 1}. "${t.name}" ($${t.ticker}) — signal ${t.signal}, ${t.buys1h} buys/hr, 24h change: ${t.priceChange24h > 0 ? '+' : ''}${t.priceChange24h.toFixed(1)}%, bonding: ${t.bondingCurveProgress}%`)
      .join('\n');

    const prompt = `You are an expert crypto analyst specialized in meme token cultural patterns on Four.meme (BNB Chain).

These are the current top trending tokens RIGHT NOW:
${tokenList}

Analyze the token NAMES carefully for cultural signals: language clusters, political references, news events, meme meta patterns, geographic communities, influencer references.

Identify 3-5 DISTINCT, specific narrative patterns. Focus on non-obvious insights that a trader would actually use, like:
- "Chinese-language tokens clustering = WeChat coordinated pump likely"
- "Trump/political tokens spiking = news-driven momentum, short-lived"
- "AI-adjacent naming surge = sector rotation from ETH AI tokens"

Return ONLY valid JSON:
{
  "patterns": [
    {
      "name": "Short name ≤20 chars",
      "tokens": ["TICKER1", "TICKER2"],
      "insight": "Specific trader insight ≤90 chars",
      "momentum": "HIGH|MED|LOW"
    }
  ]
}`;

    let raw = '{';
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: 'You are a crypto analyst. Respond with only raw JSON starting with { and ending with }. No markdown.',
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

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ patterns: [] });

    const parsed = JSON.parse(jsonMatch[0]);
    const patterns = (parsed.patterns || []).map((p: any) => ({
      id: p.name.toLowerCase().replace(/\s+/g, '-'),
      label: p.name,
      tokens: (p.tokens || []).slice(0, 4),
      insight: p.insight || '',
      momentum: p.momentum || 'MED',
      score: p.momentum === 'HIGH' ? 85 : p.momentum === 'MED' ? 65 : 45,
      growth: p.momentum === 'HIGH' ? 38 : p.momentum === 'MED' ? 18 : -5,
      color: MOMENTUM_COLOR[p.momentum] || MOMENTUM_COLOR.MED,
      aiGenerated: true,
    }));

    return NextResponse.json({ patterns });
  } catch (err) {
    return NextResponse.json({ patterns: [], error: String(err) });
  }
}
