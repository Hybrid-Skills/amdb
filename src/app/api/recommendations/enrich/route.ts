import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdb, tmdbImageUrl } from '@/lib/tmdb';
import { generateShortId } from '@/lib/id';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { profileId, title, year, reason } = await req.json();
  if (!profileId || !title) {
    return NextResponse.json({ error: 'profileId and title required' }, { status: 400 });
  }

  try {
    // 1. Search TMDB with Title [+ Year fallback]
    const search = await tmdb.searchMulti(title);
    
    // Attempt exact match or year proximity match
    const data = search.results.find(
      (r: any) =>
        (r.title ?? r.name)?.toLowerCase() === title.toLowerCase() ||
        Math.abs((r.release_date ? new Date(r.release_date).getFullYear() : (r.first_air_date ? new Date(r.first_air_date).getFullYear() : 0)) - (year || 0)) <= 1
    ) || search.results[0];

    if (!data) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const tmdbId = data.id;

    // 2. Check local Database Cache by TMDB ID
    let content = await prisma.content.findUnique({
      where: { tmdbId },
    });

    // 3. Create Content if missing
    if (!content) {
      content = await prisma.content.create({
        data: {
          id: generateShortId(),
          contentType: data.media_type === 'tv' ? 'TV_SHOW' : 'MOVIE',
          title: data.title ?? data.name,
          year: data.release_date
              ? new Date(data.release_date).getFullYear()
              : data.first_air_date
                ? new Date(data.first_air_date).getFullYear()
                : year,
          posterUrl: tmdbImageUrl(data.poster_path),
          tmdbId: tmdbId,
          tmdbRating: data.vote_average,
          overview: data.overview,
        },
      });
    }

    // 4. Create UserContent entry (RECOMMENDED status)
    const userContent = await prisma.userContent.upsert({
      where: {
        profileId_contentId: { profileId, contentId: content.id }
      },
      update: {
        // If it was previously deleted or RECOMMENDED elsewhere, don't downgrade it if it's already PLANNED/WATCHED
        // but for enrichment we just ensure it exists
      },
      create: {
        profileId,
        contentId: content.id,
        listStatus: 'RECOMMENDED',
      }
    });

    return NextResponse.json({
      ...userContent,
      content: {
        ...content,
        reason: reason // Return the AI reason
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
