import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const entry = await prisma.userContent.findFirst({
      where: {
        id,
        userId: session.user.id,
        listStatus: 'RECOMMENDED',
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    await prisma.userContent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete recommendation error:', error);
    return NextResponse.json({ error: 'Failed to delete recommendation' }, { status: 500 });
  }
}
