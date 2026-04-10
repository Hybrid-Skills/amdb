import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '12');
  const offset = parseInt(searchParams.get('offset') || '0');
  const userId = params.userId;

  try {
    const items = await prisma.userContent.findMany({
      where: {
        userId,
        userRating: { not: null },
      },
      select: {
        userRating: true,
        content: {
          select: {
            id: true,
            title: true,
            year: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Check if there are more items
    const totalCount = await prisma.userContent.count({
      where: {
        userId,
        userRating: { not: null },
      },
    });

    const hasMore = offset + items.length < totalCount;

    return NextResponse.json({
      items: items.map(item => ({
        id: item.content.id,
        title: item.content.title,
        year: item.content.year,
        rating: item.userRating!,
      })),
      hasMore,
    });
  } catch (error) {
    console.error('Failed to fetch paginated ratings:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}
