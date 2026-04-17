import { SignalTier, RiskLevel, Chain, Token } from './types';

export function calcSignal(data: {
  txnsH1: number;
  txnsH24: number;
  volumeH1: number;
  volumeH24: number;
  liquidity: number;
  priceChangeH1: number;
  priceChangeH24: number;
  createdAt: number;
  buysH1: number;
  sellsH1: number;
}): number {
  const now = Date.now();
  const ageMs = now - data.createdAt;
  const ageHours = ageMs / 3_600_000;

  // Tx velocity: how many buys per hour?
  const txVelocity = Math.min((data.buysH1 / 10) * 30, 30);

  // Volume/liquidity ratio: spike vs depth
  const volRatio = data.liquidity > 0
    ? Math.min((data.volumeH1 / data.liquidity) * 40, 30)
    : 0;

  // Price momentum (1h)
  const momentum = Math.min(Math.max(data.priceChangeH1 * 0.8 + 15, 0), 25);

  // Freshness: newer tokens have more upside signal
  const freshness = ageHours < 1 ? 15 :
                    ageHours < 6 ? 12 :
                    ageHours < 24 ? 8 :
                    ageHours < 72 ? 4 : 0;

  // Buy pressure: more buys than sells = bullish
  const total = data.buysH1 + data.sellsH1;
  const buyPressure = total > 0 ? (data.buysH1 / total) * 10 : 5;

  const raw = txVelocity + volRatio + momentum + freshness + buyPressure;
  return Math.round(Math.min(Math.max(raw, 1), 99));
}

export function getTier(signal: number): SignalTier {
  if (signal >= 80) return 'FIRE';
  if (signal >= 60) return 'HOT';
  if (signal >= 40) return 'WARM';
  return 'COLD';
}

export function getRisk(data: {
  ageHours: number;
  liquidity: number;
  sellsRatio: number;
}): RiskLevel {
  if (data.ageHours < 2 || data.liquidity < 5000) return 'DEGEN';
  if (data.ageHours < 12 || data.liquidity < 20000) return 'HIGH';
  if (data.ageHours < 72 || data.liquidity < 100000) return 'MED';
  return 'LOW';
}

export function formatAge(createdAt: number): string {
  const ms = Date.now() - createdAt;
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function formatMarketCap(n: number): string {
  if (!n || n === 0) return 'N/A';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

// Deterministic blip position from token address
export function blipPosition(address: string): { x: number; y: number } {
  let h = 0;
  for (let i = 0; i < address.length; i++) h = ((h << 5) - h + address.charCodeAt(i)) | 0;
  const angle = (Math.abs(h) % 360) * (Math.PI / 180);
  const dist = 20 + (Math.abs(h >> 8) % 65);
  const cx = 50 + Math.cos(angle) * dist * 0.9;
  const cy = 50 + Math.sin(angle) * dist * 0.9;
  return {
    x: Math.round(Math.max(10, Math.min(90, cx))),
    y: Math.round(Math.max(10, Math.min(90, cy))),
  };
}

const CHAIN_EMOJIS: Record<string, string[]> = {
  bsc:      ['🐸','🐕','🦊','🐉','🌕','🔥','💎','🚀','🤖','🐻','🦁'],
  ethereum: ['🦄','🐳','🦊','💜','🔮','⚡','🌊','🧠'],
  base:     ['🔵','🌀','💫','🏄','🎯'],
  solana:   ['🟣','⚡','🐦','🌟','💫'],
  arbitrum: ['🔹','⚙️','🔷','💻'],
};

export function tokenEmoji(chain: Chain, name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('pepe') || lower.includes('frog')) return '🐸';
  if (lower.includes('doge') || lower.includes('dog')) return '🐕';
  if (lower.includes('cat')) return '🐱';
  if (lower.includes('moon')) return '🌕';
  if (lower.includes('ai') || lower.includes('gpt')) return '🤖';
  if (lower.includes('dragon') || lower.includes('drag')) return '🐉';
  if (lower.includes('bear')) return '🐻';
  if (lower.includes('bull')) return '🐂';
  if (lower.includes('fire') || lower.includes('flame')) return '🔥';
  if (lower.includes('gold')) return '💰';
  if (lower.includes('wojak')) return '😢';
  if (lower.includes('astro') || lower.includes('space')) return '🚀';
  const pool = CHAIN_EMOJIS[chain] || ['🪙'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length];
}

export function tokenColor(ticker: string): string {
  const colors = ['#00e676','#40c4ff','#ffd60a','#ff4081','#b388ff','#ff6d00','#00e5ff','#69f0ae'];
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = ((h << 5) - h + ticker.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
}

export function extractNarratives(name: string, symbol: string): string[] {
  const lower = (name + ' ' + symbol).toLowerCase();
  const tags: string[] = [];
  if (lower.match(/pepe|frog/)) tags.push('Pepe meta');
  if (lower.match(/doge|dog|shib|floki/)) tags.push('Dog coins');
  if (lower.match(/cat|kitty|meow|nyan/)) tags.push('Cat meta');
  if (lower.match(/ai|gpt|grok|agent/)) tags.push('AI narrative');
  if (lower.match(/moon|space|rocket|astro/)) tags.push('To the moon');
  if (lower.match(/gold|silver|gem/)) tags.push('Precious metals');
  if (lower.match(/baby|mini|micro/)) tags.push('Baby tokens');
  if (lower.match(/bnb|bsc|binance/)) tags.push('BNB native');
  if (lower.match(/elon|musk|tesla/)) tags.push('Elon meta');
  if (lower.match(/based|base/)) tags.push('Based meta');
  if (lower.match(/wojak|chad|npc/)) tags.push('CT culture');
  if (tags.length === 0) tags.push('New meme');
  return tags.slice(0, 2);
}
