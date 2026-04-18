import { NextResponse } from 'next/server';
import { getAccuracyStats } from '@/lib/signalHistory';

export const runtime = 'nodejs';

export async function GET() {
  const stats = getAccuracyStats();
  return NextResponse.json(stats);
}
