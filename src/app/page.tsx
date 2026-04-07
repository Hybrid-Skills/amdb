import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { unstable_cache } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Dashboard } from '@/components/dashboard';

// Cache the list fetch per profileId for 30 seconds — makes repeat loads instant
const getCachedList = unstable_cache(
  async (profileId: string) => {
    const limit = 24;
    const [rawItems, total] = await Promise.all([
      prisma.userContent.findMany({
        where: { profileId },
        include: { content: true }, // skip enrichments join on SSR — modals load them lazily
        relationLoadStrategy: 'join',
        orderBy: { addedAt: 'desc' },
        take: limit,
      } as any),
      prisma.userContent.count({ where: { profileId } }),
    ]);
    return { rawItems, total, limit };
  },
  ['dashboard-list'],
  { revalidate: 30, tags: ['list'] },
);

export default async function HomePage() {
  // JWT strategy: no DB lookup — pure local token decode (~0ms)
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const userId = session.user.id;

  // Run profiles + list in parallel — list uses relation filter so no profileId needed upfront
  const [profiles, defaultItems, defaultCount] = await Promise.all([
    prisma.profile.findMany({
      where: { userId },
      include: { _count: { select: { userContent: true } } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.userContent.findMany({
      where: { profile: { userId, isDefault: true } },
      include: { content: true },
      relationLoadStrategy: 'join',
      orderBy: { addedAt: 'desc' },
      take: 24,
    } as any),
    prisma.userContent.count({
      where: { profile: { userId, isDefault: true } },
    }),
  ]);

  const defaultProfile = profiles.find((p) => p.isDefault) ?? profiles[0];
  const limit = 24;

  // If we got items from the parallel query, use them; otherwise hit the cache
  let listData: { items: ReturnType<typeof formatItems>; total: number; totalPages: number };

  if (defaultProfile && (defaultItems as any[]).length >= 0) {
    listData = {
      items: formatItems(defaultItems as any[]),
      total: defaultCount,
      totalPages: Math.ceil(defaultCount / limit),
    };
    // Warm the cache in the background for subsequent filter/sort changes
    getCachedList(defaultProfile.id).catch(() => {});
  } else if (defaultProfile) {
    const cached = await getCachedList(defaultProfile.id);
    listData = {
      items: formatItems(cached.rawItems as any[]),
      total: cached.total,
      totalPages: Math.ceil(cached.total / cached.limit),
    };
  } else {
    listData = { items: [], total: 0, totalPages: 0 };
  }

  return (
    <Dashboard
      initialProfiles={profiles}
      userName={session.user.name ?? ''}
      initialProfileId={defaultProfile?.id ?? ''}
      initialListData={listData}
    />
  );
}

// Flatten content into the same shape as GET /api/list
// Enrichments are intentionally skipped on SSR — omdb ratings only appear in modals
function formatItems(items: any[]) {
  return items.map((item) => ({
    ...item,
    content: {
      ...item.content,
      omdbRatings: [],
      imdbRating: null,
    },
  }));
}
