import type { NextFunction, Request, Response } from 'express';
import { JwtService } from '../services/jwt.service';
import { ApiError } from '../utils/apiResponse';

/**
 * Verifies the Bearer access token and populates `req.auth`. Reject anything
 * missing or invalid — downstream tenant scoping depends entirely on this.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = JwtService.verifyAccessToken(token);
    req.auth = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
}
