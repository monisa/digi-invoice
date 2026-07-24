<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\RefreshToken;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Mirrors backend/src/services/auth.service.ts. Auth flows establish or
 * cross the tenant boundary (signup creates a tenant; login/refresh resolve
 * which tenant a credential belongs to), so every query here filters
 * tenant_id/user_id explicitly rather than relying on BelongsToTenant's
 * auto-scoping (which is a no-op anyway until TenantScope middleware runs,
 * i.e. after these flows complete).
 */
class AuthService
{
    public function __construct(
        private readonly JwtService $jwt,
        private readonly PasswordService $password,
    ) {}

    public function signup(array $input): array
    {
        if (Tenant::where('subdomain', $input['subdomain'])->exists()) {
            throw ApiException::conflict('That subdomain is already taken');
        }

        $passwordHash = $this->password->hash($input['password']);

        [$tenant, $user] = DB::transaction(function () use ($input, $passwordHash) {
            $tenant = Tenant::create([
                'company_name' => $input['companyName'],
                'subdomain' => $input['subdomain'],
            ]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $input['adminName'],
                'email' => $input['adminEmail'],
                'password_hash' => $passwordHash,
                'role' => 'ADMIN',
                'status' => 'ACTIVE',
            ]);

            return [$tenant, $user];
        });

        $tokens = $this->issueTokens($user);

        return [...$tokens, 'user' => $this->publicUser($user), 'tenant' => $this->publicTenant($tenant)];
    }

    public function login(array $input): array
    {
        // Uniform error to avoid leaking which part failed.
        $invalid = fn () => ApiException::unauthorized('Invalid credentials');

        $tenant = Tenant::where('subdomain', $input['subdomain'])->first();
        if (! $tenant || $tenant->status !== 'ACTIVE') {
            throw $invalid();
        }

        $user = User::where('tenant_id', $tenant->id)->where('email', $input['email'])->first();
        if (! $user || $user->trashed() || $user->status === 'SUSPENDED') {
            throw $invalid();
        }

        if (! $this->password->verify($input['password'], $user->password_hash)) {
            throw $invalid();
        }

        $user->update(['last_login_at' => now()]);

        $tokens = $this->issueTokens($user);

        return [...$tokens, 'user' => $this->publicUser($user), 'tenant' => $this->publicTenant($tenant)];
    }

    /** Verify, validate against the store, then rotate (revoke old, issue new). */
    public function refresh(string $refreshToken): array
    {
        $invalid = fn () => ApiException::unauthorized('Invalid or expired refresh token');

        try {
            $payload = $this->jwt->verifyRefreshToken($refreshToken);
        } catch (\Throwable) {
            throw $invalid();
        }

        $tokenHash = $this->password->hashToken($refreshToken);
        $stored = RefreshToken::where('token_hash', $tokenHash)->first();
        if (! $stored || $stored->revoked || $stored->expires_at->isPast() || $stored->user_id !== $payload->userId) {
            throw $invalid();
        }

        $user = User::withTrashed()->find($payload->userId);
        if (! $user || $user->trashed() || $user->status === 'SUSPENDED') {
            throw $invalid();
        }

        return DB::transaction(function () use ($stored, $user) {
            $stored->update(['revoked' => true]);

            return $this->issueTokens($user);
        });
    }

    /** Idempotent: revoke the presented refresh token if it exists. */
    public function logout(string $refreshToken): void
    {
        $tokenHash = $this->password->hashToken($refreshToken);
        RefreshToken::where('token_hash', $tokenHash)->where('revoked', false)->update(['revoked' => true]);
    }

    /**
     * Issue an access/refresh pair and persist the refresh token's hash for
     * rotation/revocation. The raw refresh token is never stored.
     */
    private function issueTokens(User $user): array
    {
        $accessToken = $this->jwt->signAccessToken($user->id, $user->tenant_id, $user->role);

        $jti = (string) Str::uuid();
        $refreshToken = $this->jwt->signRefreshToken($user->id, $user->tenant_id, $jti);

        RefreshToken::create([
            'user_id' => $user->id,
            'token_hash' => $this->password->hashToken($refreshToken),
            'expires_at' => $this->jwt->expiryOf($refreshToken),
        ]);

        return ['accessToken' => $accessToken, 'refreshToken' => $refreshToken, 'tokenType' => 'Bearer'];
    }

    private function publicUser(User $user): array
    {
        return ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'role' => $user->role];
    }

    private function publicTenant(Tenant $tenant): array
    {
        return ['id' => $tenant->id, 'companyName' => $tenant->company_name, 'subdomain' => $tenant->subdomain];
    }
}
