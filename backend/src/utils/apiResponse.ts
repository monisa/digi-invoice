import type { Response } from 'express';

/**
 * Consistent response envelope: { data, meta, errors }.
 * Success responses set `errors: null`; error responses set `data: null`.
 */
export interface ApiErrorItem {
  code: string;
  message: string;
  field?: string;
}

export interface Envelope<T> {
  data: T | null;
  meta: Record<string, unknown> | null;
  errors: ApiErrorItem[] | null;
}

export function sendData<T>(
  res: Response,
  data: T,
  status = 200,
  meta: Record<string, unknown> | null = null,
): Response {
  const body: Envelope<T> = { data, meta, errors: null };
  return res.status(status).json(body);
}

export function sendErrors(
  res: Response,
  status: number,
  errors: ApiErrorItem[],
): Response {
  const body: Envelope<null> = { data: null, meta: null, errors };
  return res.status(status).json(body);
}

/**
 * Application error carrying an HTTP status and an envelope-ready error list.
 * Throw these from controllers/services; error.middleware renders them.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: ApiErrorItem[];

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = [{ code, message, ...(field ? { field } : {}) }];
  }

  static badRequest(message: string, field?: string): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message, field);
  }
  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Insufficient permissions'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string): ApiError {
    return new ApiError(409, 'CONFLICT', message);
  }
}
