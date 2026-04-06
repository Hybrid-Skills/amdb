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
  if (!tmdbId && !malId) return NextResponse.json({ error: 'tmdbId or malId required' }, { status: 400 });

  // verify profile belongs to user
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId: session.user.id }
  });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // check for existence
  const existing = await prisma.userContent.findFirst({
    where: {
      profileId,
      content: {
        OR: [
          ...(tmdbId ? [{ tmdbId: parseInt(tmdbId) }] : []),
          ...(malId ? [{ malId: parseInt(malId) }] : []),
        ]
      }
    },
    include: {
      content: true
    }
  });

  return NextResponse.json({ 
    exists: !!existing,
    userRating: existing?.userRating ?? null,
    notes: existing?.notes ?? null,
    watchStatus: existing?.watchStatus ?? null,
    item: existing ? {
      ...existing.content,
      userRating: existing.userRating,
      notes: existing.notes,
      watchStatus: existing.watchStatus
    } : null
  });
}
