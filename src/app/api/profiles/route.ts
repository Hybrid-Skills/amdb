import { NextResponse } from 'next/server';

export const preferredRegion = 'bom1';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(30),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profiles = await prisma.profile.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      avatarColor: true,
      avatarEmoji: true,
      isDefault: true,
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(profiles, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const count = await prisma.profile.count({ where: { userId: session.user.id } });
  if (count >= 5) return NextResponse.json({ error: 'Max 5 profiles allowed' }, { status: 400 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const profile = await prisma.profile.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      avatarColor: parsed.data.avatarColor ?? '#6366f1',
      isDefault: false,
    },
  });

  return NextResponse.json(profile, { status: 201 });
}
