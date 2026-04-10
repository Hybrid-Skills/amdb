import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tmdbId = searchParams.get('tmdbId');
  const malId = searchParams.get('malId');

  if (!tmdbId && !malId)
    return NextResponse.json({ error: 'tmdbId or malId required' }, { status: 400 });

  const userId = session.user.id;

  const existing = await prisma.userContent.findFirst({
    where: {
      userId,
      content: {
        OR: [
          ...(tmdbId ? [{ tmdbId: parseInt(tmdbId) }] : []),
          ...(malId ? [{ malId: parseInt(malId) }] : []),
        ],
      },
    },
    select: {
      id: true,
      listStatus: true,
      userRating: true,
      notes: true,
      watchStatus: true,
      content: {
        select: {
          id: true,
          title: true,
          year: true,
          posterUrl: true,
          tmdbRating: true,
          contentType: true,
        },
      },
    },
  });

  const isWatched = existing?.listStatus === 'WATCHED';
  const isPlanned = existing?.listStatus === 'PLANNED';

  return NextResponse.json({
    exists: isWatched,
    planned: isPlanned,
    plannedId: isPlanned ? existing!.id : null,
    userRating: isWatched ? (existing?.userRating ?? null) : null,
    notes: isWatched ? (existing?.notes ?? null) : null,
    watchStatus: isWatched ? (existing?.watchStatus ?? null) : null,
    item: existing
      ? {
          ...existing.content,
          userRating: existing.userRating,
          notes: existing.notes,
          watchStatus: existing.watchStatus,
        }
      : null,
  });
}
