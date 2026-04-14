type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; errorCode: string; error: string; redirectTo?: string };
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ClientApiError extends Error {
  errorCode: string;
  status: number;

  constructor(errorCode: string, message: string, status: number) {
    super(message);
    this.errorCode = errorCode;
    this.status = status;
  }
}

function redirectToLogin(path?: string) {
  if (typeof window === 'undefined') return;

  const current = `${window.location.pathname}${window.location.search}`;
  const loginPath =
    path ||
    `/login?from=${encodeURIComponent(current && current !== '/login' ? current : '/')}`;

  window.location.replace(loginPath);
}

export async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!payload) {
    throw new ClientApiError('INVALID_RESPONSE', '服务返回了无效响应。', response.status || 500);
  }

  if (payload.success === false && payload.errorCode === 'UNAUTHORIZED') {
    redirectToLogin(payload.redirectTo);
  }

  if (!response.ok || payload.success === false) {
    throw new ClientApiError(
      payload.success === false ? payload.errorCode : 'REQUEST_FAILED',
      payload.success === false ? payload.error : '请求失败。',
      response.status || 500,
    );
  }

  return payload.data;
}
