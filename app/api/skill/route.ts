import { NextRequest, NextResponse } from 'next/server';

// Purrfect Claw / OpenClaw skill manifest
export async function GET(req: NextRequest) {
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const base = `${protocol}://${host}`;

  const manifest = {
    skill_id: 'memeradar-signal-v1',
    name: 'MemeRadar Signal Scanner',
    version: '1.0.0',
    description: 'AI-powered meme token signal scanner. Monitors social velocity, on-chain momentum, and narrative trends across BNB Chain and other networks. Triggers buy/sell actions via TEE wallet when signal thresholds are crossed.',
    author: 'MemeRadar',
    category: 'DeFi/Trading',
    icon: '📡',
    chains: ['bsc', 'ethereum', 'base', 'solana'],
    triggers: [
      {
        id: 'signal_threshold',
        name: 'Signal Threshold Alert',
        description: 'Fires when a token signal score crosses a user-defined threshold',
        params: {
          ticker: { type: 'string', description: 'Token ticker symbol', required: true },
          threshold: { type: 'number', description: 'Signal score threshold (0-100)', default: 75 },
          chain: { type: 'string', description: 'Chain to monitor', default: 'bsc' },
        },
      },
      {
        id: 'new_fire_token',
        name: 'New FIRE Token Detected',
        description: 'Fires when a new token with signal score >= 80 is detected',
        params: {
          chain: { type: 'string', default: 'bsc' },
          min_signal: { type: 'number', default: 80 },
        },
      },
    ],
    actions: [
      {
        id: 'get_signal',
        name: 'Get Token Signal',
        description: 'Returns current signal score and metrics for a token',
        endpoint: `${base}/api/skill/signal`,
        method: 'POST',
        params: {
          ticker: { type: 'string', required: true },
          chain: { type: 'string', default: 'bsc' },
        },
      },
      {
        id: 'get_top_signals',
        name: 'Get Top Signals',
        description: 'Returns the top N tokens by signal score',
        endpoint: `${base}/api/skill/top`,
        method: 'GET',
        params: {
          chain: { type: 'string', default: 'bsc' },
          limit: { type: 'number', default: 5 },
        },
      },
      {
        id: 'buy_recommendation',
        name: 'Buy Recommendation',
        description: 'Returns buy/hold/sell recommendation based on signal + risk analysis. Use with TEE wallet to execute.',
        endpoint: `${base}/api/skill/recommend`,
        method: 'POST',
        params: {
          ticker: { type: 'string', required: true },
          chain: { type: 'string', default: 'bsc' },
          budget_usd: { type: 'number', description: 'Max budget for buy in USD', default: 10 },
        },
      },
    ],
    tee_wallet_required: true,
    pieverse_skill_store: true,
    docs: `${base}/api/skill/docs`,
    dashboard: `${base}`,
  };

  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/json' },
  });
}
