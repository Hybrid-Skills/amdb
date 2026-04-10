// Deprecated: profiles merged into User. PATCH now updates User fields.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  avatarEmoji: z.string().max(2).nullable().optional(),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, any> = {};
  if (parsed.data.name !== undefined) data.username = parsed.data.name;
  if (parsed.data.avatarColor !== undefined) data.avatarColor = parsed.data.avatarColor;
  if (parsed.data.avatarEmoji !== undefined) data.avatarEmoji = parsed.data.avatarEmoji;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      name: true,
      username: true,
      avatarColor: true,
      avatarEmoji: true,
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.username ?? updated.name ?? 'My Profile',
    avatarColor: updated.avatarColor,
    avatarEmoji: updated.avatarEmoji,
    isDefault: true,
  });
}

export async function DELETE() {
  // Profiles no longer exist as separate entities; deletion is not applicable
  return NextResponse.json({ error: 'Profiles have been merged into user accounts' }, { status: 410 });
}
