import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/watchlist/[id] — removes a PLANNED item from UserContent
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const entry = await prisma.userContent.findFirst({
    where: { id, listStatus: 'PLANNED', userId: session.user.id },
    select: { id: true },
  });
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.userContent.delete({ where: { id } });
  revalidateTag(`user-stats-${session.user.id}`);
  return NextResponse.json({ success: true });
}
