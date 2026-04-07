import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/recommendations/[id]/move-to-watchlist
// Promotes a UserContent row from RECOMMENDED → PLANNED
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify ownership via profile join
  const entry = await prisma.userContent.findFirst({
    where: { id, listStatus: 'RECOMMENDED', profile: { userId: session.user.id } },
    select: { id: true },
  });
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.userContent.update({
    where: { id },
    data: { listStatus: 'PLANNED', updatedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
