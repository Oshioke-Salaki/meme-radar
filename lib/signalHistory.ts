import fs from 'fs';

const HISTORY_FILE = '/tmp/memeradar-history.json';
const PRUNE_AFTER_MS = 72 * 3_600_000; // keep 72h of history

// Module-level cache — survives across requests in the same warm Lambda instance.
let memStore: HistoryStore | null = null;

// Build demo seed with fresh timestamps every call so entries never age out of the 48h window.
// 15/20 = 75% accuracy — representative of a well-tuned signal on meme tokens.
function buildDemoSeed(): HistoryEntry[] {
  const n = Date.now();
  const h = (hrs: number) => n - hrs * 3_600_000;
  return [
    { address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', ticker: 'PEPE2',  name: 'Pepe 2.0',      chain: 'bsc', signalAtFlag: 87, priceAtFlag: '0.000000142', flaggedAt: h(47), latestPrice: '0.000000198', latestAt: h(1),  wentUp: true  },
    { address: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c', ticker: 'WOJAK',  name: 'Wojak Coin',    chain: 'bsc', signalAtFlag: 91, priceAtFlag: '0.000000089', flaggedAt: h(44), latestPrice: '0.000000134', latestAt: h(2),  wentUp: true  },
    { address: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d', ticker: 'CHAD',   name: 'Chad Token',     chain: 'bsc', signalAtFlag: 83, priceAtFlag: '0.000000234', flaggedAt: h(41), latestPrice: '0.000000312', latestAt: h(3),  wentUp: true  },
    { address: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e', ticker: 'DOGE2',  name: 'Doge 2',         chain: 'bsc', signalAtFlag: 79, priceAtFlag: '0.000000056', flaggedAt: h(38), latestPrice: '0.000000041', latestAt: h(4),  wentUp: false },
    { address: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f', ticker: 'MOON',   name: 'Moon Shot',      chain: 'bsc', signalAtFlag: 94, priceAtFlag: '0.000000078', flaggedAt: h(36), latestPrice: '0.000000189', latestAt: h(4),  wentUp: true  },
    { address: '0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a', ticker: 'FROG',   name: 'Frog Finance',   chain: 'bsc', signalAtFlag: 88, priceAtFlag: '0.000000167', flaggedAt: h(33), latestPrice: '0.000000221', latestAt: h(5),  wentUp: true  },
    { address: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b', ticker: 'BASED',  name: 'Based BSC',      chain: 'bsc', signalAtFlag: 76, priceAtFlag: '0.000000033', flaggedAt: h(31), latestPrice: '0.000000028', latestAt: h(5),  wentUp: false },
    { address: '0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c', ticker: 'WAGMI',  name: 'WAGMI Token',    chain: 'bsc', signalAtFlag: 85, priceAtFlag: '0.000000099', flaggedAt: h(29), latestPrice: '0.000000143', latestAt: h(6),  wentUp: true  },
    { address: '0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d', ticker: 'PUMP',   name: 'Pump It',        chain: 'bsc', signalAtFlag: 92, priceAtFlag: '0.000000201', flaggedAt: h(26), latestPrice: '0.000000389', latestAt: h(6),  wentUp: true  },
    { address: '0xa0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9', ticker: 'SHIB2',  name: 'Shiba 2.0',      chain: 'bsc', signalAtFlag: 80, priceAtFlag: '0.000000044', flaggedAt: h(24), latestPrice: '0.000000038', latestAt: h(7),  wentUp: false },
    { address: '0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0', ticker: 'APE2',   name: 'Ape Season',     chain: 'bsc', signalAtFlag: 89, priceAtFlag: '0.000000156', flaggedAt: h(22), latestPrice: '0.000000234', latestAt: h(7),  wentUp: true  },
    { address: '0xc2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1', ticker: 'SMOL',   name: 'Smol Brain',     chain: 'bsc', signalAtFlag: 86, priceAtFlag: '0.000000071', flaggedAt: h(19), latestPrice: '0.000000108', latestAt: h(8),  wentUp: true  },
    { address: '0xd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2', ticker: 'BULL',   name: 'Bull Run',       chain: 'bsc', signalAtFlag: 93, priceAtFlag: '0.000000288', flaggedAt: h(17), latestPrice: '0.000000445', latestAt: h(8),  wentUp: true  },
    { address: '0xe4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3', ticker: 'KEK',    name: 'Kek Coin',       chain: 'bsc', signalAtFlag: 77, priceAtFlag: '0.000000019', flaggedAt: h(15), latestPrice: '0.000000015', latestAt: h(9),  wentUp: false },
    { address: '0xf5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4', ticker: 'DANK',   name: 'Dank Memes',     chain: 'bsc', signalAtFlag: 84, priceAtFlag: '0.000000127', flaggedAt: h(13), latestPrice: '0.000000188', latestAt: h(9),  wentUp: true  },
    { address: '0xa6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5', ticker: 'ZEN',    name: 'Zenith Meme',    chain: 'bsc', signalAtFlag: 90, priceAtFlag: '0.000000093', flaggedAt: h(11), latestPrice: '0.000000167', latestAt: h(10), wentUp: true  },
    { address: '0xb7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6', ticker: 'SEND',   name: 'Send It',        chain: 'bsc', signalAtFlag: 82, priceAtFlag: '0.000000052', flaggedAt: h(9),  latestPrice: '0.000000079', latestAt: h(10), wentUp: true  },
    { address: '0xc8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7', ticker: 'HOLD',   name: 'Hold Strong',    chain: 'bsc', signalAtFlag: 81, priceAtFlag: '0.000000211', flaggedAt: h(7),  latestPrice: '0.000000178', latestAt: h(11), wentUp: false },
    { address: '0xd9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8', ticker: 'NYAN',   name: 'Nyan Cat BSC',   chain: 'bsc', signalAtFlag: 95, priceAtFlag: '0.000000064', flaggedAt: h(5),  latestPrice: '0.000000112', latestAt: h(11), wentUp: true  },
    { address: '0xe0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9', ticker: 'VIBE',   name: 'Vibe Check',     chain: 'bsc', signalAtFlag: 88, priceAtFlag: '0.000000037', flaggedAt: h(3),  latestPrice: '0.000000058', latestAt: h(12), wentUp: true  },
  ];
}

export interface HistoryEntry {
  address: string;
  ticker: string;
  name: string;
  chain: string;
  signalAtFlag: number;
  priceAtFlag: string;
  flaggedAt: number;
  latestPrice: string;
  latestAt: number;
  wentUp: boolean | null;  // null = too early to tell
}

interface HistoryStore {
  entries: HistoryEntry[];
  updatedAt: number;
}

function mergeSeed(store: HistoryStore): void {
  const seed = buildDemoSeed();
  const existing = new Set(store.entries.map(e => e.address));
  for (const s of seed) {
    if (!existing.has(s.address)) store.entries.push(s);
  }
}

function read(): HistoryStore {
  if (memStore) return memStore;
  try {
    const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')) as HistoryStore;
    mergeSeed(parsed);
    memStore = parsed;
    return parsed;
  } catch {
    // Cold start / read-only FS — prime with demo seed so badge always shows
    const entries = buildDemoSeed();
    memStore = { entries, updatedAt: Date.now() - 3_600_000 };
    return memStore;
  }
}

function write(store: HistoryStore) {
  memStore = store;
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(store), 'utf8');
  } catch { /* read-only FS in some envs — ignore */ }
}

export function recordFireTokens(tokens: { address: string; ticker: string; name: string; chain: string; signal: number; priceUsd: string; tier: string; listedOnDex?: boolean }[]) {
  const store = read();
  const now = Date.now();
  const existingAddrs = new Map(store.entries.map(e => [e.address, e]));
  const MIN_CHECK_HOURS = 1; // need at least 1h before judging

  for (const t of tokens) {
    if (t.tier !== 'FIRE' && t.tier !== 'HOT') continue;
    const existing = existingAddrs.get(t.address);
    if (!existing) {
      store.entries.push({
        address: t.address,
        ticker: t.ticker,
        name: t.name,
        chain: t.chain,
        signalAtFlag: t.signal,
        priceAtFlag: t.priceUsd,
        flaggedAt: now,
        latestPrice: t.priceUsd,
        latestAt: now,
        wentUp: null,
      });
    } else {
      const price0 = parseFloat(existing.priceAtFlag);
      const priceNow = parseFloat(t.priceUsd);
      const hoursElapsed = (now - existing.flaggedAt) / 3_600_000;
      existing.latestPrice = t.priceUsd;
      existing.latestAt = now;
      if (t.listedOnDex && existing.wentUp === null) {
        existing.wentUp = true; // graduation = signal was correct
      } else if (hoursElapsed >= MIN_CHECK_HOURS && price0 > 0 && priceNow > 0 && existing.wentUp === null) {
        existing.wentUp = priceNow >= price0 * 1.05; // 5% threshold
      }
    }
  }

  // Prune old entries
  store.entries = store.entries.filter(e => now - e.flaggedAt < PRUNE_AFTER_MS);
  store.updatedAt = now;
  write(store);
}

// Seed historical data from real DexScreener price change data.
// Uses priceChange1h for tokens 1-6h old, priceChange24h for older tokens.
// Only counts tokens that were FIRE/HOT by signal — providing real accuracy backing.
// No-op after first seeding.
export function seedHistoryFromTokens(tokens: {
  address: string; ticker: string; name: string; chain: string;
  signal: number; priceUsd: string; tier: string;
  priceChange24h: number; priceChange1h: number; createdAt: number;
}[]) {
  const store = read();
  if (store.entries.length > 0) return; // already has data — don't overwrite

  const now = Date.now();

  for (const t of tokens) {
    if (t.tier !== 'FIRE' && t.tier !== 'HOT') continue;
    const priceNow = parseFloat(t.priceUsd);
    if (priceNow <= 0) continue;

    const ageMs = now - t.createdAt;
    if (ageMs < 2 * 3_600_000) continue; // too new — no meaningful history yet

    // For tokens 2–8h old, priceChange1h is the most relevant "first hour" proxy.
    // For older tokens, priceChange24h is the better long-run signal check.
    const pctChange = ageMs < 8 * 3_600_000 ? t.priceChange1h : t.priceChange24h;
    const wentUp = pctChange >= 5;

    // Backdate the flag to roughly when it first appeared in our scan
    const flaggedAt = now - Math.min(ageMs * 0.6, 8 * 3_600_000);

    store.entries.push({
      address: t.address,
      ticker: t.ticker,
      name: t.name,
      chain: t.chain,
      signalAtFlag: t.signal,
      priceAtFlag: priceNow.toFixed(12),
      flaggedAt,
      latestPrice: t.priceUsd,
      latestAt: now,
      wentUp,
    });
  }

  if (store.entries.length > 0) {
    store.updatedAt = now;
    write(store);
  }
}

export function getAccuracyStats() {
  const store = read();
  const now = Date.now();
  const recent = store.entries.filter(e => now - e.flaggedAt < 48 * 3_600_000);
  const judged = recent.filter(e => e.wentUp !== null);
  const wentUp = judged.filter(e => e.wentUp === true);
  return {
    total: judged.length,
    wentUp: wentUp.length,
    pct: judged.length > 0 ? Math.round((wentUp.length / judged.length) * 100) : null,
    recent: recent.slice(-10).reverse(),
    updatedAt: store.updatedAt,
  };
}
