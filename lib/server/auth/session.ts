import type { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'xchatai_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  username: string;
  exp: number;
};

function getConfiguredUsername() {
  return process.env.XCHATAI_AUTH_USERNAME?.trim() || '';
}

function getConfiguredPasswordMd5() {
  return process.env.XCHATAI_AUTH_PASSWORD_MD5?.trim().toLowerCase() || '';
}

function getSessionSecret() {
  return (
    process.env.XCHATAI_AUTH_SESSION_SECRET?.trim() ||
    `${getConfiguredUsername()}:${getConfiguredPasswordMd5()}`
  );
}

function toBase64Url(bytes: Uint8Array) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(padded, 'base64'));
  }

  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importSessionKey() {
  const secret = getSessionSecret();
  if (!secret) return null;

  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function signPayload(payload: string) {
  const key = await importSessionKey();
  if (!key) return null;

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

function encodePayload(payload: SessionPayload) {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

function decodePayload(tokenPart: string) {
  const text = new TextDecoder().decode(fromBase64Url(tokenPart));
  return JSON.parse(text) as SessionPayload;
}

export async function createSessionToken(username: string) {
  const payload = encodePayload({
    username,
    exp: Date.now() + SESSION_DURATION_SECONDS * 1000,
  });
  const signature = await signPayload(payload);

  if (!signature) {
    throw new Error(
      '缺少登录会话配置，请在 .env 中配置 XCHATAI_AUTH_USERNAME 与 XCHATAI_AUTH_PASSWORD_MD5。',
    );
  }

  return `${payload}.${signature}`;
}

export async function isValidSessionToken(token?: string | null) {
  if (!token) return false;

  const [payloadPart, signaturePart, ...rest] = token.split('.');
  if (!payloadPart || !signaturePart || rest.length > 0) {
    return false;
  }

  const expectedSignature = await signPayload(payloadPart);
  if (!expectedSignature || expectedSignature !== signaturePart) {
    return false;
  }

  try {
    const payload = decodePayload(payloadPart);
    return payload.username === getConfiguredUsername() && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function isAuthenticatedRequest(request: NextRequest) {
  return isValidSessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export async function attachSessionCookie(response: NextResponse, username: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: await createSessionToken(username),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    path: '/',
    expires: new Date(0),
  });
}
