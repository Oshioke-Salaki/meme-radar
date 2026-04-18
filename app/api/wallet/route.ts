import { NextRequest, NextResponse } from 'next/server';

const BSC_RPC = 'https://bsc-rpc.publicnode.com';
const BALANCE_OF_SELECTOR = '0x70a08231';

function encodeBalanceOf(wallet: string): string {
  return BALANCE_OF_SELECTOR + '000000000000000000000000' + wallet.slice(2).toLowerCase().padStart(40, '0');
}

interface TokenQuery {
  address: string;
  ticker: string;
  name: string;
  priceUsd: string;
  signal: number;
  tier: string;
  color: string;
  decimals?: number;
}

export interface WalletHolding {
  address: string;
  ticker: string;
  name: string;
  balance: number;
  balanceUsd: number;
  priceUsd: string;
  signal: number;
  tier: string;
  color: string;
}

async function batchRpc(calls: { to: string; data: string; id: number }[]): Promise<any[]> {
  const batch = calls.map(c => ({
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [{ to: c.to, data: c.data }, 'latest'],
    id: c.id,
  }));

  const res = await fetch(BSC_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('RPC error');
  const results: any[] = await res.json();
  return results.sort((a, b) => a.id - b.id);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('address')?.toLowerCase();
  const tokensParam = searchParams.get('tokens');

  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ holdings: [], error: 'Invalid wallet address' }, { status: 400 });
  }

  if (!tokensParam) {
    return NextResponse.json({ holdings: [], error: 'tokens param required' }, { status: 400 });
  }

  let tokens: TokenQuery[];
  try {
    tokens = JSON.parse(tokensParam);
  } catch {
    return NextResponse.json({ holdings: [], error: 'Invalid tokens JSON' }, { status: 400 });
  }

  // Filter to BSC tokens with valid addresses
  const bscTokens = tokens.filter(t => t.address && t.address.startsWith('0x') && t.address.length === 42);
  if (bscTokens.length === 0) return NextResponse.json({ holdings: [] });

  // Batch balanceOf calls — max 30 at a time
  const batch = bscTokens.slice(0, 30).map((t, i) => ({
    to: t.address,
    data: encodeBalanceOf(wallet),
    id: i,
  }));

  try {
    const results = await batchRpc(batch);

    const holdings: WalletHolding[] = [];
    for (let i = 0; i < bscTokens.length && i < results.length; i++) {
      const token = bscTokens[i];
      const result = results[i];
      if (!result?.result || result.result === '0x' || result.error) continue;

      const rawBalance = BigInt(result.result);
      if (rawBalance === BigInt(0)) continue;

      const decimals = token.decimals ?? 18;
      const balance = Number(rawBalance) / Math.pow(10, decimals);
      const priceUsd = parseFloat(token.priceUsd || '0');
      const balanceUsd = balance * priceUsd;

      // Only show if balance has any real value or is non-zero
      if (balance === 0) continue;

      holdings.push({
        address: token.address,
        ticker: token.ticker,
        name: token.name,
        balance,
        balanceUsd,
        priceUsd: token.priceUsd,
        signal: token.signal,
        tier: token.tier,
        color: token.color,
      });
    }

    // Sort by USD value descending
    holdings.sort((a, b) => b.balanceUsd - a.balanceUsd);

    return NextResponse.json({ holdings, wallet });
  } catch (err) {
    return NextResponse.json({ holdings: [], error: String(err) });
  }
}
