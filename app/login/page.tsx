import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { SESSION_COOKIE_NAME, isValidSessionToken } from '@/lib/server/auth/session';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (await isValidSessionToken(token)) {
    redirect('/');
  }

  return <LoginForm />;
}
