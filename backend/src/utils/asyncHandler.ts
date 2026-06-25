import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wrap async route handlers so rejected promises reach the error middleware
 * instead of crashing the process. Usage: router.get('/', asyncHandler(fn)).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
