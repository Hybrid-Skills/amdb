import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

async function getProfile(profileId: string, userId: string) {
  return prisma.profile.findFirst({ where: { id: profileId, userId } });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const profile = await getProfile(id, session.user.id);
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.profile.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const profile = await getProfile(id, session.user.id);
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (profile.isDefault) return NextResponse.json({ error: 'Cannot delete default profile' }, { status: 400 });

  await prisma.profile.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
