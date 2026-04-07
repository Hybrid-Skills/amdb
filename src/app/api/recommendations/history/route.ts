import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    prisma.userContent.findMany({
      where: { profileId, listStatus: 'RECOMMENDED' },
      orderBy: { addedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        listStatus: true,
        addedAt: true,
        recommendationReason: true,
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
          },
        },
      },
    }),
    prisma.userContent.count({ where: { profileId, listStatus: 'RECOMMENDED' } }),
  ]);

  // Normalise shape: rename addedAt → createdAt for UI consistency
  const normalised = items.map((i) => ({ ...i, createdAt: i.addedAt }));

  return NextResponse.json({
    items: normalised,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
