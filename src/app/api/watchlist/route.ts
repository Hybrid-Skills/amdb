import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/watchlist?profileId=&page=
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get('profileId');
  const page  = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = 18;

  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 });

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [items, total] = await Promise.all([
    prisma.userWatchlist.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        contentType: true,
        createdAt: true,
        content: {
          select: {
            id: true,
            title: true,
            year: true,
            posterUrl: true,
            tmdbRating: true,
            tmdbId: true,
            malId: true,
            contentType: true,
          },
        },
      },
    }),
    prisma.userWatchlist.count({ where: { profileId } }),
  ]);

  return NextResponse.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}

// POST /api/watchlist — add content to watchlist
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { profileId, contentId, contentType } = await req.json();
  if (!profileId || !contentId || !contentType) {
    return NextResponse.json({ error: 'profileId, contentId, contentType required' }, { status: 400 });
  }

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Verify content exists
  const content = await prisma.content.findUnique({ where: { id: contentId }, select: { id: true } });
  if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 });

  try {
    const entry = await prisma.userWatchlist.create({
      data: {
        userId: session.user.id,
        profileId,
        contentId,
        contentType,
      },
    });
    return NextResponse.json({ id: entry.id });
  } catch (err: any) {
    // Unique constraint = already in watchlist
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Already in watchlist' }, { status: 409 });
    }
    console.error('Watchlist add error:', err);
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
  }
}
