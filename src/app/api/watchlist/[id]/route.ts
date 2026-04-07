import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/watchlist/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.userWatchlist.findFirst({
    where: { id, profile: { userId: session.user.id } },
  });
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.userWatchlist.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
