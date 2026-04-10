import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

  if (user.username) {
    redirect(`/user/${user.username}`);
  }

  // Fallback if no username exists (shouldn't happen with our auth flow)
  redirect('/');
}
