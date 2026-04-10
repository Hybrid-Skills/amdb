// Deprecated: profiles have been merged into User. Redirecting to /api/user.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      avatarColor: true,
      avatarEmoji: true,
    },
  });

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Return as single-item array to maintain backward compat with any remaining callers
  return NextResponse.json([{
    id: user.id,
    name: user.username ?? user.name ?? 'My Profile',
    avatarColor: user.avatarColor,
    avatarEmoji: user.avatarEmoji,
    isDefault: true,
  }]);
}
