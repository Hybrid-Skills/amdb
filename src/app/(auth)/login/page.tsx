import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LoginPage } from '@/components/auth/login-page';

export default async function Login() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/');
  }

  return <LoginPage />;
}
