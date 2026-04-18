import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url || !url.startsWith('https://four.meme/')) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        Referer: 'https://four.meme/',
        Origin: 'https://four.meme',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'image/*,*/*',
      },
    });
    if (!res.ok) return new Response('', { status: res.status });

    return new Response(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('', { status: 502 });
  }
}
