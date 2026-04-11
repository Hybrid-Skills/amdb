import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export const preferredRegion = 'bom1';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/watchlist?page=
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const contentType = searchParams.get('contentType');
  const sortBy = searchParams.get('sortBy') || 'addedAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const minRating = Number(searchParams.get('minRating') || '1');
  const maxRating = Number(searchParams.get('maxRating') || '10');
  const genres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
  const watchStatuses = searchParams.get('watchStatuses')?.split(',').filter(Boolean) || [];
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = 18;

  const where: any = {
    userId,
    listStatus: 'PLANNED',
    content: {},
  };

  if (contentType && contentType !== 'ALL') {
    where.content.contentType = contentType;
  }

  // Watch status filter
  if (watchStatuses.length > 0) {
    where.watchStatus = { in: watchStatuses };
  }

  // Rating filter — only apply when not the default full range, to avoid excluding null-rated items
  if (minRating > 1 || maxRating < 10) {
    where.content.tmdbRating = { gte: minRating, lte: maxRating };
  }

  // Genre filtering — genreNames is pipe-delimited e.g. |Action|Drama|
  if (genres.length > 0) {
    where.AND = genres.map((genre) => ({
      content: {
        genreNames: { contains: `|${genre.trim()}|` },
      },
    }));
  }

  // Determine order by
  let orderBy: any = { addedAt: sortOrder };
  if (sortBy === 'userRating') {
    orderBy = { userRating: sortOrder };
  } else if (sortBy === 'tmdbRating') {
    orderBy = { content: { tmdbRating: sortOrder } };
  } else if (sortBy === 'title') {
    orderBy = { content: { title: sortOrder } };
  } else if (sortBy === 'year') {
    orderBy = { content: { year: sortOrder } };
  }

  const [items, total] = await Promise.all([
    prisma.userContent.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        listStatus: true,
        addedAt: true,
        watchStatus: true,
        recommendationLabel: true,
        recommendationReason: true,
        referredByUserId: true,
        referredBy: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarColor: true,
            avatarEmoji: true,
          },
        },
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
            ageCertification: true,
            runtimeMins: true,
            episodeRuntime: true,
            shortDescription: true,
          },
        },
      },
    }),
    prisma.userContent.count({ where }),
  ]);

  // Normalise shape: rename addedAt → createdAt for UI consistency
  const normalised = items.map((i) => ({ ...i, createdAt: i.addedAt }));

  return NextResponse.json(
    { items: normalised, total, page, totalPages: Math.ceil(total / limit) },
    {
      headers: { 'Cache-Control': 'private, max-age=30' },
    },
  );
}

// POST /api/watchlist — create PLANNED entry, or promote RECOMMENDED → PLANNED
// Never downgrades a WATCHED entry
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const { contentId, contentType, refUsername } = await req.json();
  if (!contentId || !contentType) {
    return NextResponse.json({ error: 'contentId, contentType required' }, { status: 400 });
  }

  // Resolve referral: look up by username, avoid self-referral
  let referredByUserId: string | undefined;
  if (refUsername && typeof refUsername === 'string') {
    const refUser = await prisma.user.findFirst({
      where: { username: { equals: refUsername, mode: 'insensitive' } },
      select: { id: true },
    });
    if (refUser && refUser.id !== userId) referredByUserId = refUser.id;
  }

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { id: true },
  });
  if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 });

  // Check if an entry already exists
  const existing = await prisma.userContent.findUnique({
    where: { userId_contentId: { userId, contentId } },
    select: { id: true, listStatus: true },
  });

  if (existing) {
    if (existing.listStatus === 'WATCHED') {
      // Already watched — don't downgrade
      return NextResponse.json({ id: existing.id, skipped: true });
    }
    if (existing.listStatus === 'PLANNED') {
      // Already planned — no-op
      return NextResponse.json({ id: existing.id });
    }
    // RECOMMENDED → promote to PLANNED
    const updated = await prisma.userContent.update({
      where: { id: existing.id },
      data: {
        listStatus: 'PLANNED',
        updatedAt: new Date(),
        ...(referredByUserId ? { referredByUserId } : {}),
      },
    });
    return NextResponse.json({ id: updated.id });
  }

  // No entry yet — create PLANNED
  const entry = await prisma.userContent.create({
    data: { userId, contentId, listStatus: 'PLANNED', ...(referredByUserId ? { referredByUserId } : {}) },
  });
  revalidateTag(`user-stats-${userId}`);
  return NextResponse.json({ id: entry.id });
}
