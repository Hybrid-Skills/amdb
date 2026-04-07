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
  const limit = 18; // 3 rows of 6 cards

  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 });

  // Verify profile belongs to session user
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [items, total] = await Promise.all([
    prisma.userRecommendation.findMany({
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
    prisma.userRecommendation.count({ where: { profileId } }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
