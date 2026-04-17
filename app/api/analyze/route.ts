import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const token = await req.json();

  const prompt = `You are a brutally honest meme token analyst on BNB Chain / Four.meme.

Analyze this token and give a SHORT, punchy trader-style take. No fluff, no disclaimers.

TOKEN DATA:
- Name: ${token.name} ($${token.ticker})
- Chain: ${token.chain?.toUpperCase()}
- Signal Score: ${token.signal}/100 (${token.tier} tier)
- Age: Listed ${token.age} ago
- Price: $${parseFloat(token.priceUsd || '0').toExponential(3)}
- 24h Price Change: ${token.priceChange24h > 0 ? '+' : ''}${token.priceChange24h}%
- 1h Price Change: ${token.priceChange1h > 0 ? '+' : ''}${token.priceChange1h}%
- Market Cap: ${token.marketCap}
- Buys last hour: ${token.buys1h} | Sells last hour: ${token.sells1h}
- Total txns today: ${(token.buys24h || 0) + (token.sells24h || 0)}
- Buy pressure: ${token.buys1h + token.sells1h > 0 ? Math.round((token.buys1h / (token.buys1h + token.sells1h)) * 100) : 50}%
- Bonding curve: ${token.bondingCurveProgress}% full${token.bondingCurveProgress >= 80 ? ' (⚡ NEAR GRADUATION!)' : ''}
- Listed on DEX: ${token.listedOnDex ? 'Yes — already on PancakeSwap' : 'No — still on bonding curve'}
- Risk level: ${token.risk}
- Narratives: ${token.narratives?.join(', ') || 'unknown'}
- Social links: ${[token.twitterUrl, token.telegramUrl].filter(Boolean).join(', ') || 'none found'}

Respond with ONLY raw JSON, no markdown, no code fences, no explanation. Start your response with { and end with }:
{
  "verdict": "BULLISH" | "BEARISH" | "NEUTRAL",
  "confidence": <number 0-100>,
  "thesis": "<2-3 punchy sentences. Be specific about the numbers. What's the actual opportunity or risk?>",
  "catalyst": "<one specific thing that could make this pump in the next 24h>",
  "risk": "<one specific reason this could go to zero>",
  "suggestion": "BUY" | "WATCH" | "AVOID",
  "suggestedSizeUsd": <suggested position size in USD, 0 if AVOID>
}`;

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: 'You are a brutally honest crypto analyst. Always respond with raw JSON only — no markdown, no code fences, no explanation. Your response must start with { and end with }.',
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: '{' },
    ],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
