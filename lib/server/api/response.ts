import { NextResponse } from 'next/server';
import { AppRouteError, isAppRouteError } from './http-error';

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function apiError(errorCode: string, error: string, status = 400) {
  return NextResponse.json({ success: false, errorCode, error }, { status });
}

export function handleRouteError(error: unknown) {
  if (isAppRouteError(error)) {
    return apiError(error.errorCode, error.message, error.status);
  }

  console.error(error);
  return apiError('INTERNAL_ERROR', '服务异常，请稍后重试。', 500);
}

export function assertCondition(condition: unknown, status: number, errorCode: string, message: string): asserts condition {
  if (!condition) {
    throw new AppRouteError(status, errorCode, message);
  }
}
