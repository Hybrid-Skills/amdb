import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/recommendations/[id]/move-to-watchlist
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify the recommendation belongs to this user
  const rec = await prisma.userRecommendation.findFirst({
    where: { id, profile: { userId: session.user.id } },
    select: { id: true, profileId: true, contentId: true, contentType: true },
  });
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    // Add to watchlist (upsert — may already exist)
    await prisma.userWatchlist.upsert({
      where: { profileId_contentId: { profileId: rec.profileId, contentId: rec.contentId } },
      create: {
        userId:      session.user.id,
        profileId:   rec.profileId,
        contentId:   rec.contentId,
        contentType: rec.contentType,
      },
      update: {}, // already there — no-op
    });

    // Remove from recommendations
    await prisma.userRecommendation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('move-to-watchlist error:', err);
    return NextResponse.json({ error: 'Failed to move to watchlist' }, { status: 500 });
  }
}
