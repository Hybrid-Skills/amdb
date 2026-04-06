import { NextResponse } from 'next/server';
import { fetchMovieDetail, fetchTvDetail, fetchAnimeDetail } from '@/lib/content-detail';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type');

  if (!id || !type) {
    return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });
  }

  try {
    let watchProviders = null;
    const numericId = parseInt(id);

    if (type === 'MOVIE') {
      const details = await fetchMovieDetail(numericId);
      watchProviders = details.watchProviders;
    } else if (type === 'TV_SHOW') {
      const details = await fetchTvDetail(numericId);
      watchProviders = details.watchProviders;
    } else if (type === 'ANIME') {
      const details = await fetchAnimeDetail(numericId);
      watchProviders = details.watchProviders;
    }

    return NextResponse.json({ watchProviders });
  } catch (error) {
    console.error('Error fetching watch providers:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
