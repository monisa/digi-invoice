import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { env } from '../config/env';

/**
 * Password hashing uses bcryptjs (pure JS) rather than the native `bcrypt`
 * module — native bindings frequently fail to build on Hostinger shared Node
 * hosting. Refresh tokens are stored as SHA-256 digests (fast, single-use
 * comparison on a high-entropy value, so no need for a slow KDF).
 */
export const PasswordService = {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
  },

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  },

  /** Deterministic hash for storing/looking up refresh tokens. */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  },
};
