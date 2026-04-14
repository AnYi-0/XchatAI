'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginRequest } from '@/lib/services/auth-client';

function resolveReturnPath(from: string | null) {
  if (!from) return '/';
  if (!from.startsWith('/') || from.startsWith('//')) return '/';
  return from;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await loginRequest({ username, password });
      router.replace(resolveReturnPath(searchParams.get('from')));
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '登录失败。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10 text-foreground dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-2xl shadow-black/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/80"
        >
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="XchatAI" className="size-12 rounded-2xl object-cover" />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">XchatAI</h1>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">用户名</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-11 rounded-2xl border border-border/70 bg-background/80 px-4 outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-2xl border border-border/70 bg-background/80 px-4 outline-none"
              />
            </label>
          </div>

          {error ? <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div> : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-70"
          >
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
