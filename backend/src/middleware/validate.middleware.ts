import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Validate and coerce a request part against a zod schema, replacing it with
 * the parsed (typed, stripped) value. A failed parse throws a ZodError, which
 * Express forwards to errorHandler (rendered as a 422 envelope).
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // req.query is a getter on newer Express; assign onto it in place.
    Object.assign(req.query, schema.parse(req.query));
    next();
  };
}

export function validateParams(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    Object.assign(req.params, schema.parse(req.params));
    next();
  };
}
