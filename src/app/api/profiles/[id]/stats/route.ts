import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProfileStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const profile = await prisma.profile.findFirst({ where: { id, userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const stats = await getProfileStats(id);
  return NextResponse.json(stats);
}
