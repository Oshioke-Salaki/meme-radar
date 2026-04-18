import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BSC_RPC = 'https://bsc-rpc.publicnode.com';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const BLOCK_RANGE = 200; // ~10 min of BSC blocks

async function rpc(method: string, params: unknown[]): Promise<any> {
  const res = await fetch(BSC_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
    cache: 'no-store',
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

async function getBuyers(tokenAddress: string): Promise<string[]> {
  try {
    const latestHex: string = await rpc('eth_blockNumber', []);
    const latest = parseInt(latestHex, 16);
    const fromBlock = '0x' + (latest - BLOCK_RANGE).toString(16);

    const logs: any[] = await rpc('eth_getLogs', [{
      fromBlock,
      toBlock: 'latest',
      address: tokenAddress,
      topics: [TRANSFER_TOPIC],
    }]);

    if (!logs?.length) return [];

    // Detect pool address = highest-frequency counterparty
    const freq: Record<string, number> = {};
    for (const log of logs) {
      const from = '0x' + log.topics[1].slice(26);
      const to = '0x' + log.topics[2].slice(26);
      if (from !== ZERO_ADDR && from !== tokenAddress) freq[from] = (freq[from] || 0) + 1;
      if (to !== ZERO_ADDR && to !== tokenAddress) freq[to] = (freq[to] || 0) + 1;
    }
    const pool = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0]?.toLowerCase() || '';
    if (!pool) return [];

    const buyers = new Set<string>();
    for (const log of logs) {
      const from = ('0x' + log.topics[1].slice(26)).toLowerCase();
      const to = ('0x' + log.topics[2].slice(26)).toLowerCase();
      if (from === ZERO_ADDR || to === ZERO_ADDR) continue;
      if (from === pool) buyers.add(to); // pool → wallet = buy
    }

    return [...buyers];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tokens }: { tokens: { address: string; ticker: string }[] } = await req.json();
    if (!tokens?.length) return NextResponse.json({ smartWallets: [], tokenBuyers: {} });

    const top = tokens.slice(0, 4);
    const buyerLists = await Promise.all(top.map(t => getBuyers(t.address)));

    // Map wallet → set of token addresses where it bought
    const walletTokens = new Map<string, Set<string>>();
    for (let i = 0; i < top.length; i++) {
      for (const wallet of buyerLists[i]) {
        if (!walletTokens.has(wallet)) walletTokens.set(wallet, new Set());
        walletTokens.get(wallet)!.add(top[i].address.toLowerCase());
      }
    }

    // Smart money = wallets that bought 2+ different FIRE tokens in this window
    const smartWallets = [...walletTokens.entries()]
      .filter(([, toks]) => toks.size >= 2)
      .map(([wallet]) => wallet);

    const tokenBuyers: Record<string, string[]> = {};
    for (let i = 0; i < top.length; i++) {
      tokenBuyers[top[i].address.toLowerCase()] = buyerLists[i];
    }

    return NextResponse.json({ smartWallets, tokenBuyers });
  } catch (err) {
    return NextResponse.json({ smartWallets: [], tokenBuyers: {}, error: String(err) });
  }
}
