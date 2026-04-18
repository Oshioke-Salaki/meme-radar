export type SignalTier = 'FIRE' | 'HOT' | 'WARM' | 'COLD';
export type RiskLevel = 'LOW' | 'MED' | 'HIGH' | 'DEGEN';
export type Platform = 'X' | 'TG' | 'Reddit' | 'Discord';
export type Chain = 'bsc' | 'ethereum' | 'base' | 'solana' | 'arbitrum';

export const CHAIN_META: Record<Chain, { label: string; symbol: string; color: string; icon: string }> = {
  bsc:      { label: 'BNB Chain', symbol: 'BNB',  color: '#f0b90b', icon: '🟡' },
  ethereum: { label: 'Ethereum',  symbol: 'ETH',  color: '#627eea', icon: '🔷' },
  base:     { label: 'Base',      symbol: 'ETH',  color: '#0052ff', icon: '🔵' },
  solana:   { label: 'Solana',    symbol: 'SOL',  color: '#9945ff', icon: '🟣' },
  arbitrum: { label: 'Arbitrum',  symbol: 'ETH',  color: '#28a0f0', icon: '🔹' },
};

export interface Token {
  id: string;
  name: string;
  ticker: string;
  emoji: string;
  color: string;
  chain: Chain;
  address: string;
  pairAddress: string;

  signal: number;
  signalDelta: number;
  tier: SignalTier;
  risk: RiskLevel;

  socialVelocity: number;
  velocityDelta: number;
  priceUsd: string;
  priceChange1h: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: string;
  fdv: number;

  buys24h: number;
  sells24h: number;
  buys1h: number;
  sells1h: number;

  bondingCurveProgress: number;
  listedOnDex: boolean;
  dexName: string;

  narratives: string[];
  platforms: Platform[];
  blipX: number;
  blipY: number;
  age: string;
  createdAt: number;
  sparkline: number[];

  fourMemeUrl: string;
  dexScreenerUrl: string;
  imageUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  websiteUrl?: string;
  creatorAddress?: string;   // Four.meme creator wallet
  bondingCurveBnb?: number;  // BNB raised toward 24 BNB graduation
  fourMemeStatus?: string;   // INIT | PRESALE | TRADE from Four.meme
  fourMemeTag?: string;      // Meme, AI, etc.
  aiScored?: boolean;        // true when signal was scored by Claude
  timeToGradMinutes?: number; // estimated minutes until bonding curve graduation
  rugRisk?: RugRisk;         // AI rug pull risk assessment
  smartMoneyActive?: boolean; // smart money wallet detected buying this token
}

export interface RugRisk {
  score: number;      // 0-100 (0 = safe, 100 = certain rug)
  level: 'SAFE' | 'CAUTION' | 'DANGER';
  summary: string;
}

export interface FeedEvent {
  id: string;
  type: 'SIGNAL_UP' | 'SIGNAL_DOWN' | 'NEW_TOKEN' | 'NARRATIVE' | 'ALERT';
  ticker: string;
  emoji: string;
  message: string;
  platform: Platform;
  timestamp: Date;
  value?: number;
  color: string;
  chain: Chain;
}

export interface Narrative {
  id: string;
  label: string;
  score: number;
  tokens: string[];
  growth: number;
  color: string;
  insight?: string;      // AI-generated trader insight
  momentum?: 'LOW' | 'MED' | 'HIGH';
  aiGenerated?: boolean;
}

export interface Stats {
  tokensScanned: number;
  activeSignals: number;
  narrativesTracked: number;
  alertsToday: number;
}
