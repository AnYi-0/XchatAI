export class AppRouteError extends Error {
  status: number;
  errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

export function isAppRouteError(error: unknown): error is AppRouteError {
  return error instanceof AppRouteError;
}
