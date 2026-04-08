import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Dashboard } from '@/components/dashboard';

export default async function HomePage() {
  // JWT strategy: no DB lookup — pure local token decode (~0ms)
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return <Dashboard userName={session.user.name ?? ''} />;
}
