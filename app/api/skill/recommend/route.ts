import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { ticker, chain = 'bsc', budget_usd = 10 } = body;

  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';

  try {
    const res = await fetch(`${protocol}://${host}/api/tokens?chain=${chain}`);
    const { tokens } = await res.json();
    const token = (tokens || []).find((t: any) =>
      t.ticker.toLowerCase() === ticker.toLowerCase()
    );

    if (!token) {
      return NextResponse.json({ error: `Token ${ticker} not found on ${chain}` }, { status: 404 });
    }

    const action = token.signal >= 75 ? 'BUY'
      : token.signal >= 50 ? 'WATCH'
      : 'AVOID';

    const confidence = Math.round(
      (token.signal / 100) * 0.6 +
      (token.buys1h / Math.max(token.sells1h, 1)) * 0.2 +
      (token.priceChange24h > 0 ? 0.2 : 0)
    * 100) / 100;

    const suggestedBuy = action === 'BUY'
      ? Math.min(budget_usd, budget_usd * (token.signal / 100))
      : 0;

    return NextResponse.json({
      ticker: token.ticker,
      name: token.name,
      chain,
      signal: token.signal,
      tier: token.tier,
      action,
      confidence: Math.min(confidence, 0.95),
      reasoning: [
        `Signal score: ${token.signal}/100 (${token.tier})`,
        `24h price: ${token.priceChange24h > 0 ? '+' : ''}${token.priceChange24h}%`,
        `Buy/sell ratio 1h: ${token.buys1h}/${token.sells1h}`,
        `Liquidity: ${token.liquidity > 0 ? '$' + token.liquidity.toLocaleString() : 'N/A'}`,
        `Risk level: ${token.risk}`,
      ],
      suggested_buy_usd: suggestedBuy.toFixed(2),
      token_address: token.address,
      four_meme_url: token.fourMemeUrl,
      disclaimer: 'This is not financial advice. Always DYOR.',
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
