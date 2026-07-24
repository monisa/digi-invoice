<?php

namespace App\Services;

use DateTimeImmutable;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use RuntimeException;
use stdClass;

/**
 * Mirrors backend/src/services/jwt.service.ts. Access tokens carry
 * {userId, tenantId, role}; refresh tokens carry {userId, tenantId, jti}.
 * tenantId here is the ONLY trusted source of tenant identity downstream —
 * never read tenantId from the request body.
 */
class JwtService
{
    public function signAccessToken(string $userId, string $tenantId, string $role): string
    {
        $now = time();

        return JWT::encode([
            'userId' => $userId,
            'tenantId' => $tenantId,
            'role' => $role,
            'iat' => $now,
            'exp' => $now + config('jwt.access_ttl_minutes') * 60,
        ], config('jwt.access_secret'), config('jwt.algo'));
    }

    public function signRefreshToken(string $userId, string $tenantId, string $jti): string
    {
        $now = time();

        return JWT::encode([
            'userId' => $userId,
            'tenantId' => $tenantId,
            'jti' => $jti,
            'iat' => $now,
            'exp' => $now + config('jwt.refresh_ttl_minutes') * 60,
        ], config('jwt.refresh_secret'), config('jwt.algo'));
    }

    public function verifyAccessToken(string $token): stdClass
    {
        return JWT::decode($token, new Key(config('jwt.access_secret'), config('jwt.algo')));
    }

    public function verifyRefreshToken(string $token): stdClass
    {
        return JWT::decode($token, new Key(config('jwt.refresh_secret'), config('jwt.algo')));
    }

    /** Expiry instant of a signed token, from its exp claim. */
    public function expiryOf(string $token): DateTimeImmutable
    {
        $parts = explode('.', $token);
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);

        if (! isset($payload['exp'])) {
            throw new RuntimeException('Token has no exp claim');
        }

        return (new DateTimeImmutable())->setTimestamp($payload['exp']);
    }
}
