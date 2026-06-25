import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError, sendErrors, type ApiErrorItem } from '../utils/apiResponse';
import { isProd } from '../config/env';

/**
 * Central error handler. Translates known error types into the standard
 * envelope. Must be registered LAST, after all routes.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // next is required so Express recognises this as an error handler (4 args).
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    sendErrors(res, err.status, err.errors);
    return;
  }

  if (err instanceof ZodError) {
    const errors: ApiErrorItem[] = err.issues.map((i) => ({
      code: 'VALIDATION_ERROR',
      message: i.message,
      field: i.path.join('.') || undefined,
    }));
    sendErrors(res, 422, errors);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    sendErrors(res, mapPrismaStatus(err.code), [
      { code: `PRISMA_${err.code}`, message: prismaMessage(err) },
    ]);
    return;
  }

  // Unknown / unexpected
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  sendErrors(res, 500, [
    {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Internal server error' : String((err as Error)?.message ?? err),
    },
  ]);
}

function mapPrismaStatus(code: string): number {
  switch (code) {
    case 'P2002': // unique constraint
      return 409;
    case 'P2025': // record not found
      return 404;
    case 'P2003': // FK constraint
      return 409;
    default:
      return 400;
  }
}

function prismaMessage(err: Prisma.PrismaClientKnownRequestError): string {
  switch (err.code) {
    case 'P2002': {
      const target = (err.meta?.target as string[] | undefined)?.join(', ');
      return target ? `A record with this ${target} already exists` : 'Unique constraint violated';
    }
    case 'P2025':
      return 'Record not found';
    case 'P2003':
      return 'Related record constraint violated';
    default:
      return isProd ? 'Database error' : err.message;
  }
}
