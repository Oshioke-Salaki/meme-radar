import { NextRequest, NextResponse } from 'next/server';

export interface OnChainTrade {
  hash: string;
  type: 'BUY' | 'SELL';
  wallet: string;
  walletFull: string;
  tokenAmount: number;
  usdAmount: number;
  timestamp: number;
  timeAgo: string;
  blockNumber: number;
}

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const BSC_RPC = 'https://bsc-rpc.publicnode.com';
const BLOCK_RANGE = 300; // ~15 min of BSC blocks (3s each)
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

function shorten(addr: string) {
  if (!addr || addr.length < 10) return addr;
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
    next: { revalidate: 0 },
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address')?.toLowerCase();
  const priceUsd = parseFloat(searchParams.get('price') || '0');
  const decimals = parseInt(searchParams.get('decimals') || '18', 10);

  if (!address) return NextResponse.json({ trades: [], error: 'address required' }, { status: 400 });

  try {
    const latestHex: string = await rpc('eth_blockNumber', []);
    const latest = parseInt(latestHex, 16);
    const fromBlock = '0x' + (latest - BLOCK_RANGE).toString(16);

    const logs: any[] = await rpc('eth_getLogs', [{
      fromBlock,
      toBlock: 'latest',
      address,
      topics: [TRANSFER_TOPIC],
    }]);

    if (!logs || logs.length === 0) {
      return NextResponse.json({ trades: [] });
    }

    // Detect pool address = most frequent non-zero counterparty
    const freq: Record<string, number> = {};
    for (const log of logs) {
      const from = '0x' + log.topics[1].slice(26);
      const to = '0x' + log.topics[2].slice(26);
      if (from !== ZERO_ADDR && from !== address) freq[from] = (freq[from] || 0) + 1;
      if (to !== ZERO_ADDR && to !== address) freq[to] = (freq[to] || 0) + 1;
    }
    const poolAddress = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    const trades: OnChainTrade[] = logs
      .slice(-25)           // last 25 events
      .reverse()            // newest first
      .slice(0, 20)
      .map((log: any): OnChainTrade | null => {
        try {
          const from = '0x' + log.topics[1].slice(26);
          const to = '0x' + log.topics[2].slice(26);
          // Skip mint/burn events
          if (from === ZERO_ADDR || to === ZERO_ADDR) return null;

          const isBuy = from.toLowerCase() === poolAddress.toLowerCase();
          const userAddr = isBuy ? to : from;

          const rawValue = BigInt(log.data);
          const tokenAmt = Number(rawValue) / Math.pow(10, decimals);
          const usdAmt = priceUsd > 0 ? tokenAmt * priceUsd : 0;

          const ts = log.blockTimestamp ? parseInt(log.blockTimestamp, 16) : Math.floor(Date.now() / 1000) - 60;

          return {
            hash: log.transactionHash,
            type: isBuy ? 'BUY' : 'SELL',
            wallet: shorten(userAddr),
            walletFull: userAddr,
            tokenAmount: tokenAmt,
            usdAmount: usdAmt,
            timestamp: ts,
            timeAgo: timeAgo(ts),
            blockNumber: parseInt(log.blockNumber, 16),
          };
        } catch {
          return null;
        }
      })
      .filter((t): t is OnChainTrade => t !== null);

    return NextResponse.json({ trades, poolAddress, fromBlock: latest - BLOCK_RANGE, toBlock: latest });
  } catch (err) {
    return NextResponse.json({ trades: [], error: String(err) });
  }
}
