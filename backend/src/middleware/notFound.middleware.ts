import type { Request, Response } from 'express';
import { sendErrors } from '../utils/apiResponse';

/** Catch-all for unmatched routes — registered after all routers. */
export function notFound(req: Request, res: Response): void {
  sendErrors(res, 404, [
    { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  ]);
}
