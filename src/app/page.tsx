import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Dashboard } from '@/components/dashboard';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const profiles = await prisma.profile.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { userContent: true } } },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  return <Dashboard initialProfiles={profiles} userName={session.user.name ?? ''} />;
}
