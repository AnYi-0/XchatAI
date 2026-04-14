import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/server/auth/session';

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ success: true, data: { ok: true } });
  clearSessionCookie(response);
  return response;
}
