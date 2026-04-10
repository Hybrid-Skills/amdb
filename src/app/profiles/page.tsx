import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProfileStats } from '@/lib/stats';
import { ProfilesShell } from '@/components/profiles/profiles-shell';
import { cookies } from 'next/headers';

export default async function ProfilesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const profiles = await prisma.profile.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      avatarColor: true,
      avatarEmoji: true,
      isDefault: true,
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  if (profiles.length === 0) redirect('/');

  // Determine active profile from cookie
  const cookieStore = await cookies();
  const raw = cookieStore.get('amdb_profile')?.value;
  let activeId = profiles[0].id;
  if (raw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (parsed?.id && profiles.some((p) => p.id === parsed.id)) {
        activeId = parsed.id;
      }
    } catch { /* fallback to first */ }
  }

  const stats = await getProfileStats(activeId);

  return (
    <ProfilesShell
      profiles={profiles}
      initialStats={stats}
      initialActiveId={activeId}
    />
  );
}
