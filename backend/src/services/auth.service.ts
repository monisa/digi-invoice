import { randomUUID } from 'node:crypto';
import type { Tenant, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';
import { ApiError } from '../utils/apiResponse';
import type { LoginInput, SignupInput } from '../validators/auth.validator';

/**
 * Auth flows establish or cross the tenant boundary (signup creates a tenant;
 * login/refresh resolve which tenant a credential belongs to), so they use the
 * base `prisma` client rather than a tenant-scoped one — and scope every query
 * explicitly by tenantId/userId.
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
}

interface AuthResult extends AuthTokens {
  user: PublicUser;
  tenant: PublicTenant;
}

interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: User['role'];
}

interface PublicTenant {
  id: string;
  companyName: string;
  subdomain: string;
}

function publicUser(u: User): PublicUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

function publicTenant(t: Tenant): PublicTenant {
  return { id: t.id, companyName: t.companyName, subdomain: t.subdomain };
}

/**
 * Issue an access/refresh pair and persist the refresh token's hash for
 * rotation/revocation. The raw refresh token is never stored.
 */
async function issueTokens(user: User): Promise<AuthTokens> {
  const accessToken = JwtService.signAccessToken({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  const refreshToken = JwtService.signRefreshToken({
    userId: user.id,
    tenantId: user.tenantId,
    jti: randomUUID(),
  });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: PasswordService.hashToken(refreshToken),
      expiresAt: JwtService.expiryOf(refreshToken),
    },
  });

  return { accessToken, refreshToken, tokenType: 'Bearer' };
}

export const AuthService = {
  async signup(input: SignupInput): Promise<AuthResult> {
    const existing = await prisma.tenant.findUnique({
      where: { subdomain: input.subdomain },
      select: { id: true },
    });
    if (existing) {
      throw ApiError.conflict('That subdomain is already taken');
    }

    const passwordHash = await PasswordService.hash(input.password);

    const { tenant, user } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          companyName: input.companyName,
          subdomain: input.subdomain,
        },
      });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: input.adminName,
          email: input.adminEmail,
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
      return { tenant, user };
    });

    const tokens = await issueTokens(user);
    return { ...tokens, user: publicUser(user), tenant: publicTenant(tenant) };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: input.subdomain },
    });
    // Uniform error to avoid leaking which part failed.
    const invalid = ApiError.unauthorized('Invalid credentials');
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw invalid;
    }

    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: input.email } },
    });
    if (!user || user.deletedAt || user.status === 'SUSPENDED') {
      throw invalid;
    }

    const ok = await PasswordService.compare(input.password, user.passwordHash);
    if (!ok) {
      throw invalid;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await issueTokens(user);
    return { ...tokens, user: publicUser(user), tenant: publicTenant(tenant) };
  },

  /** Verify, validate against the store, then rotate (revoke old, issue new). */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const invalid = ApiError.unauthorized('Invalid or expired refresh token');

    let payload;
    try {
      payload = JwtService.verifyRefreshToken(refreshToken);
    } catch {
      throw invalid;
    }

    const tokenHash = PasswordService.hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revoked || stored.expiresAt < new Date() || stored.userId !== payload.userId) {
      throw invalid;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.deletedAt || user.status === 'SUSPENDED') {
      throw invalid;
    }

    // Rotate atomically: revoke the presented token, issue a fresh pair.
    const tokens = await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revoked: true },
      });
      const accessToken = JwtService.signAccessToken({
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
      });
      const newRefresh = JwtService.signRefreshToken({
        userId: user.id,
        tenantId: user.tenantId,
        jti: randomUUID(),
      });
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: PasswordService.hashToken(newRefresh),
          expiresAt: JwtService.expiryOf(newRefresh),
        },
      });
      return { accessToken, refreshToken: newRefresh, tokenType: 'Bearer' as const };
    });

    return tokens;
  },

  /** Idempotent: revoke the presented refresh token if it exists. */
  async logout(refreshToken: string): Promise<void> {
    const tokenHash = PasswordService.hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revoked: false },
      data: { revoked: true },
    });
  },
};
