import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  username: z.string().min(1).max(30).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  avatarEmoji: z.string().max(2).nullable().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      username: true,
      avatarColor: true,
      avatarEmoji: true,
    },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Check username uniqueness if being changed
  if (parsed.data.username) {
    const existing = await prisma.user.findFirst({
      where: { username: parsed.data.username, NOT: { id: session.user.id } },
    });
    if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      username: true,
      avatarColor: true,
      avatarEmoji: true,
    },
  });

  return NextResponse.json(updated);
}
