import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Dashboard } from '@/components/dashboard';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Fetch profiles and initial list in parallel
  const profiles = await prisma.profile.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { userContent: true } } },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  const defaultProfile = profiles.find((p) => p.isDefault) ?? profiles[0];

  let initialListData = { items: [] as ReturnType<typeof formatItems>, total: 0, totalPages: 0 };

  if (defaultProfile) {
    const limit = 24;
    const [rawItems, total] = await Promise.all([
      prisma.userContent.findMany({
        where: { profileId: defaultProfile.id },
        include: {
          content: {
            include: { enrichments: { where: { source: 'omdb' }, take: 1 } },
          },
        },
        orderBy: { addedAt: 'desc' },
        take: limit,
      }),
      prisma.userContent.count({ where: { profileId: defaultProfile.id } }),
    ]);

    initialListData = {
      items: formatItems(rawItems),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  return (
    <Dashboard
      initialProfiles={profiles}
      userName={session.user.name ?? ''}
      initialProfileId={defaultProfile?.id ?? ''}
      initialListData={initialListData}
    />
  );
}

// Flatten omdb enrichments into the content object — same shape as GET /api/list
function formatItems(
  items: Awaited<
    ReturnType<
      typeof prisma.userContent.findMany<{
        include: {
          content: { include: { enrichments: { where: { source: string }; take: number } } };
        };
      }>
    >
  >,
) {
  return items.map((item) => {
    const omdb = item.content?.enrichments?.[0]?.data as Record<string, unknown> | undefined;
    const { enrichments: _e, ...contentRest } = item.content as typeof item.content & {
      enrichments: unknown[];
    };
    return {
      ...item,
      content: {
        ...contentRest,
        omdbRatings: (omdb?.Ratings as { Source: string; Value: string }[]) ?? [],
        imdbRating: (omdb?.imdbRating as string) ?? null,
      },
    };
  });
}
