import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/server/api/response';
import { attachSessionCookie } from '@/lib/server/auth/session';
import { loginWithPassword } from '@/lib/server/services/auth-service';
import { parseLoginPayload } from '@/lib/server/validators/xchatai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = parseLoginPayload(body);
    const user = await loginWithPassword(payload.username, payload.password);

    const response = NextResponse.json({ success: true, data: { user } });
    await attachSessionCookie(response, user.username);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
