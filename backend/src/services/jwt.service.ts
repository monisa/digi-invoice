import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '@prisma/client';

/**
 * Claims carried by the access token. tenantId here is the ONLY trusted source
 * of tenant identity downstream — never read tenantId from the request body.
 */
export interface AccessTokenPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  userId: string;
  tenantId: string;
  /** Opaque token id, also stored hashed in the RefreshToken table for rotation/revocation. */
  jti: string;
}

export const JwtService = {
  signAccessToken(payload: AccessTokenPayload): string {
    const opts: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'] };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, opts);
  },

  signRefreshToken(payload: RefreshTokenPayload): string {
    const opts: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'] };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, opts);
  },

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  },

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  },
};
