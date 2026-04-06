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
    let details;
    if (type === 'MOVIE') {
      details = await tmdb.movieDetails(tmdbId);
    } else if (type === 'TV_SHOW' || type === 'ANIME') {
      details = await tmdb.tvDetails(tmdbId);
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Extract watch providers: Prefer IN (consistent with lib/content-detail), fallback to US
    const watchProviders =
      (details as any)['watch/providers']?.results?.IN ||
      (details as any)['watch/providers']?.results?.US ||
      null;

    return NextResponse.json({ watchProviders });
  } catch (error) {
    console.error('Watch providers error:', error);
    return NextResponse.json({ error: 'Failed to fetch watch providers' }, { status: 500 });
  }
}
