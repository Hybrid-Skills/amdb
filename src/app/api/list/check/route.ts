import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get('profileId');
  const tmdbId = searchParams.get('tmdbId');
  const malId = searchParams.get('malId');

  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 });
  if (!tmdbId && !malId)
    return NextResponse.json({ error: 'tmdbId or malId required' }, { status: 400 });

  // Auth and data fetch in one round-trip
  const existing = await prisma.userContent.findFirst({
    where: {
      profileId,
      profile: { userId: session.user.id }, // Security check merged
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

  if (!existing && profileId) {
    // We still need to verify the profile exists/belongs to user if no content found
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId: session.user.id },
    });
    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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
