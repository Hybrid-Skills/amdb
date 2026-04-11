import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProfileStats } from '@/lib/stats';
import { ProfilePageShell } from '@/components/profiles/profile-page-shell';
import { buildContentUrl } from '@/lib/slug';

export const dynamic = 'force-dynamic';

interface Props {
  params: { username: string };
}

export default async function UserProfilePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;
  const username = resolvedParams.username;

  // Find user by username (case-insensitive findFirst for vanity URLs)
  const profileUser = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatarColor: true,
      avatarEmoji: true,
      email: true,
    },
  });

  if (!profileUser) notFound();

  // Parallelize fetches for better performance
  const [stats, initialRatedData] = await Promise.all([
    getProfileStats(profileUser.id),
    prisma.userContent.findMany({
      where: {
        userId: profileUser.id,
        userRating: { not: null },
      },
      select: {
        userRating: true,
        content: {
          select: {
            id: true,
            title: true,
            year: true,
            contentType: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 12,
    }),
  ]);

  // Check if there are more items for initial pagination state
  const totalRatedCount = await prisma.userContent.count({
    where: {
      userId: profileUser.id,
      userRating: { not: null },
    },
  });

  const isOwner = session?.user?.id === profileUser.id;

  return (
    <ProfilePageShell
      profileUser={{
        id: profileUser.id,
        name: profileUser.name ?? 'New User',
        username: profileUser.username ?? 'user',
        email: isOwner ? profileUser.email : null, // Privacy
        avatarColor: profileUser.avatarColor,
        avatarEmoji: profileUser.avatarEmoji,
      }}
      isOwner={isOwner}
      stats={stats}
      initialRatedItems={initialRatedData.map((item) => ({
        id: item.content.id,
        title: item.content.title,
        year: item.content.year,
        rating: item.userRating!,
        url: buildContentUrl(item.content.contentType, item.content.title, item.content.id),
      }))}
      initialHasMore={totalRatedCount > 12}
    />
  );
}
