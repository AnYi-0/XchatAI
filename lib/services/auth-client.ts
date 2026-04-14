import type { AuthUser } from '@/lib/types/xchatai';
import { requestJson } from './http-client';

export async function loginRequest(payload: { username: string; password: string }) {
  return requestJson<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logoutRequest() {
  return requestJson<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
