import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProfileStats } from '@/lib/stats';
import { ProfilesShell } from '@/components/profiles/profiles-shell';

export default async function ProfilesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      avatarColor: true,
      avatarEmoji: true,
      email: true,
    },
  });

  if (!user) redirect('/');

  const stats = await getProfileStats(session.user.id);

  return (
    <ProfilesShell
      user={{
        id: user.id,
        name: user.name ?? 'My Profile',
        username: user.username,
        avatarColor: user.avatarColor,
        avatarEmoji: user.avatarEmoji,
      }}
      initialStats={stats}
    />
  );
}
