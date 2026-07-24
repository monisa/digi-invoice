<?php

namespace App\Services;

use Illuminate\Support\Facades\Hash;

/**
 * Mirrors backend/src/services/password.service.ts. Refresh tokens are
 * stored as SHA-256 digests (fast, single-use comparison on a high-entropy
 * value, so no need for a slow KDF).
 */
class PasswordService
{
    public function hash(string $plain): string
    {
        return Hash::make($plain);
    }

    public function verify(string $plain, string $hash): bool
    {
        return Hash::check($plain, $hash);
    }

    public function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }
}
