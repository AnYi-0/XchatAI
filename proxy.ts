import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isAuthenticatedRequest } from '@/lib/server/auth/session';

const PUBLIC_PAGE_PATHS = new Set(['/login']);
const PUBLIC_API_PATHS = new Set(['/api/auth/login', '/api/auth/logout']);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = await isAuthenticatedRequest(request);

  if (PUBLIC_PAGE_PATHS.has(pathname) || PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const from = `${pathname}${request.nextUrl.search}`;
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', from);

    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'UNAUTHORIZED',
          error: '未登录，无法访问此接口。',
          redirectTo: `${loginUrl.pathname}${loginUrl.search}`,
        },
        { status: 401 },
      );
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|logo.png).*)'],
};
