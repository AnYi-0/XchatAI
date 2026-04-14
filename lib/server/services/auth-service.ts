import { createHash, timingSafeEqual } from 'node:crypto';
import { AppRouteError } from '@/lib/server/api/http-error';
import type { AuthUser } from '@/lib/types/xchatai';

function getConfiguredAuth() {
  const username = process.env.XCHATAI_AUTH_USERNAME?.trim() || '';
  const passwordMd5 = process.env.XCHATAI_AUTH_PASSWORD_MD5?.trim().toLowerCase() || '';

  if (!username || !/^[a-f0-9]{32}$/i.test(passwordMd5)) {
    throw new AppRouteError(
      500,
      'AUTH_CONFIG_MISSING',
      '请先在 .env 中配置 XCHATAI_AUTH_USERNAME 和 XCHATAI_AUTH_PASSWORD_MD5。',
    );
  }

  return {
    username,
    passwordMd5,
  };
}

function md5(value: string) {
  return createHash('md5').update(value).digest('hex');
}

function isMatchingHash(input: string, expectedHash: string) {
  const actualBuffer = Buffer.from(md5(input));
  const expectedBuffer = Buffer.from(expectedHash);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function toAuthUser(username: string): AuthUser {
  return {
    id: username,
    username,
    displayName: username,
  };
}

export async function loginWithPassword(username: string, password: string) {
  const configuredAuth = getConfiguredAuth();

  if (username !== configuredAuth.username || !isMatchingHash(password, configuredAuth.passwordMd5)) {
    throw new AppRouteError(401, 'INVALID_CREDENTIALS', '账号或密码错误。');
  }

  return toAuthUser(configuredAuth.username);
}

export async function getCurrentUser() {
  return toAuthUser(getConfiguredAuth().username);
}
