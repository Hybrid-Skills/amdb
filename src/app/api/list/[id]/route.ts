import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  userRating: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
  watchedDate: z.string().datetime().nullish(),
  watchStatus: z.enum(['WATCHING', 'PLAN_TO_WATCH', 'COMPLETED', 'DROPPED']).nullish(),
  startDate: z.string().datetime().nullish(),
  endDate: z.string().datetime().nullish(),
  episodeCount: z.number().int().min(0).nullish(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const item = await prisma.userContent.findFirst({
    where: { id },
    include: { profile: true },
  });
  if (!item || item.profile.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.userContent.update({
    where: { id },
    data: { ...parsed.data, updatedAt: new Date() },
    include: { content: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const item = await prisma.userContent.findFirst({
    where: { id },
    include: { profile: true },
  });
  if (!item || item.profile.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.userContent.delete({ where: { id } });
  revalidateTag(`profile-stats-${item.profileId}`);
  return new NextResponse(null, { status: 204 });
}
