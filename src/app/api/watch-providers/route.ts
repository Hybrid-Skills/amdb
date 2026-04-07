import { NextResponse } from 'next/server';
import { tmdb } from '@/lib/tmdb';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type');

  if (!id || !type) {
    return NextResponse.json({ error: 'id and type are required' }, { status: 400 });
  }

  try {
    const tmdbId = parseInt(id);

    // Use dedicated lightweight endpoints instead of fetching the full details payload
    let results: Record<string, any>;
    if (type === 'MOVIE') {
      const data = await tmdb.movieWatchProviders(tmdbId);
      results = data.results ?? {};
    } else if (type === 'TV_SHOW' || type === 'ANIME') {
      const data = await tmdb.tvWatchProviders(tmdbId);
      results = data.results ?? {};
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Prefer IN (India), fallback to US
    const watchProviders = results.IN ?? results.US ?? null;

    return NextResponse.json(
      { watchProviders },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch (error) {
    console.error('Watch providers error:', error);
    return NextResponse.json({ error: 'Failed to fetch watch providers' }, { status: 500 });
  }
}
