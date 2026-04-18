import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TokenPageClient from './TokenPageClient';

interface Props {
  params: Promise<{ address: string }>;
}

async function fetchToken(address: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/tokens?chain=bsc`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const { tokens } = await res.json();
    return (tokens as any[]).find((t: any) =>
      t.address?.toLowerCase() === address.toLowerCase() ||
      t.id?.toLowerCase() === address.toLowerCase()
    ) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const token = await fetchToken(address);

  if (!token) {
    return {
      title: 'Token not found — MemeRadar',
      description: 'This token could not be found on MemeRadar.',
    };
  }

  const priceDisplay = parseFloat(token.priceUsd) > 0
    ? `$${parseFloat(token.priceUsd) < 0.001 ? parseFloat(token.priceUsd).toExponential(2) : parseFloat(token.priceUsd).toFixed(4)}`
    : '';

  const title = `$${token.ticker} — Signal ${token.signal}/100 | MemeRadar`;
  const description = [
    `${token.name} (${token.tier} tier)`,
    priceDisplay && `Price: ${priceDisplay}`,
    `24h: ${token.priceChange24h >= 0 ? '+' : ''}${token.priceChange24h.toFixed(1)}%`,
    `Market cap: ${token.marketCap}`,
    token.narratives?.length ? `Narrative: ${token.narratives.slice(0, 2).join(', ')}` : null,
  ].filter(Boolean).join(' · ');

  const ogImageUrl = `/token/${address}/og-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      type: 'website',
      siteName: 'MemeRadar',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function TokenPage({ params }: Props) {
  const { address } = await params;
  const token = await fetchToken(address);
  if (!token) notFound();
  return <TokenPageClient token={token} />;
}
