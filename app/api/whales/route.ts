import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BSC_RPC = 'https://bsc-rpc.publicnode.com';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const BLOCK_RANGE = 300;
const MIN_USD = 150;

export interface WhaleEvent {
  ticker: string;
  color: string;
  type: 'BUY' | 'SELL';
  usdAmount: number;
  wallet: string;
  walletFull: string;
  hash: string;
  timeAgo: string;
  blockNumber: number;
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(ts: number) {
  const s = Math.floor(Date.now() / 1000) - ts;
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

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

async function fetchLargeTrades(
  address: string,
  ticker: string,
  color: string,
  priceUsd: number,
  decimals = 18
): Promise<WhaleEvent[]> {
  try {
    const latestHex: string = await rpc('eth_blockNumber', []);
    const latest = parseInt(latestHex, 16);
    const fromBlock = '0x' + (latest - BLOCK_RANGE).toString(16);

    const logs: any[] = await rpc('eth_getLogs', [{
      fromBlock, toBlock: 'latest',
      address, topics: [TRANSFER_TOPIC],
    }]);

    if (!logs?.length) return [];

    // Detect pool
    const freq: Record<string, number> = {};
    for (const log of logs) {
      const from = ('0x' + log.topics[1].slice(26)).toLowerCase();
      const to = ('0x' + log.topics[2].slice(26)).toLowerCase();
      if (from !== ZERO_ADDR && from !== address.toLowerCase()) freq[from] = (freq[from] || 0) + 1;
      if (to !== ZERO_ADDR && to !== address.toLowerCase()) freq[to] = (freq[to] || 0) + 1;
    }
    const pool = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    if (!pool) return [];

    const events: WhaleEvent[] = [];
    for (const log of logs) {
      try {
        const from = ('0x' + log.topics[1].slice(26)).toLowerCase();
        const to = ('0x' + log.topics[2].slice(26)).toLowerCase();
        if (from === ZERO_ADDR || to === ZERO_ADDR) continue;

        const isBuy = from === pool;
        const userAddr = isBuy ? to : from;
        const raw = BigInt(log.data);
        const tokenAmt = Number(raw) / Math.pow(10, decimals);
        const usdAmt = priceUsd > 0 ? tokenAmt * priceUsd : 0;

        if (usdAmt < MIN_USD) continue;

        const ts = log.blockTimestamp ? parseInt(log.blockTimestamp, 16) : Math.floor(Date.now() / 1000) - 120;

        events.push({
          ticker, color,
          type: isBuy ? 'BUY' : 'SELL',
          usdAmount: usdAmt,
          wallet: shorten(userAddr),
          walletFull: userAddr,
          hash: log.transactionHash,
          timeAgo: timeAgo(ts),
          blockNumber: parseInt(log.blockNumber, 16),
        });
      } catch { /* skip malformed */ }
    }

    return events;
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tokens }: { tokens: { address: string; ticker: string; color: string; priceUsd: string }[] } = await req.json();
    if (!tokens?.length) return NextResponse.json({ whales: [] });

    const top = tokens.slice(0, 5);
    const lists = await Promise.all(
      top.map(t => fetchLargeTrades(t.address, t.ticker, t.color, parseFloat(t.priceUsd) || 0))
    );

    const all = lists.flat().sort((a, b) => b.usdAmount - a.usdAmount).slice(0, 30);
    return NextResponse.json({ whales: all });
  } catch (err) {
    return NextResponse.json({ whales: [], error: String(err) });
  }
}
