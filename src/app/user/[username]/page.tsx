import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProfileStats } from '@/lib/stats';
import { ProfilePageShell } from '@/components/profiles/profile-page-shell';

interface Props {
  params: { username: string };
}

export default async function UserProfilePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  
  // Find user by username
  const profileUser = await prisma.user.findUnique({
    where: { username: params.username },
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

  // Fetch stats and rated items
  const stats = await getProfileStats(profileUser.id);
  
  // Fetch rated items for the "List" tab
  const ratedItems = await prisma.userContent.findMany({
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
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
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
      ratedItems={ratedItems.map(item => ({
        id: item.content.id,
        title: item.content.title,
        year: item.content.year,
        rating: item.userRating!,
      }))}
    />
  );
}
