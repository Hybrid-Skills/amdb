import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// One-time backfill: populate genreNames for all Content rows that have genres but no genreNames
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch all content with genres data but missing genreNames
  const items = await prisma.content.findMany({
    where: { genreNames: null },
    select: { id: true, genres: true },
  });

  let updated = 0;
  for (const item of items) {
    const genres = item.genres as { id: number; name: string }[] | null;
    if (!genres || genres.length === 0) continue;

    const genreNames = `|${genres.map((g) => g.name).join('|')}|`;
    await prisma.content.update({
      where: { id: item.id },
      data: { genreNames },
    });
    updated++;
  }

  return NextResponse.json({ total: items.length, updated });
}
