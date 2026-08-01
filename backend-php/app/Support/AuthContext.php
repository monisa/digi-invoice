<?php

namespace App\Support;

/**
 * Per-request holder for the verified JWT's claims, populated by
 * JwtAuthenticate middleware. Bound as a singleton in AppServiceProvider —
 * safe under traditional PHP-FPM/Apache (one process per request); would
 * need resetting between requests if this app ever moves to Octane.
 */
class AuthContext
{
    public ?string $userId = null;
    public ?string $tenantId = null;
    public ?string $role = null;

    public function set(string $userId, string $tenantId, string $role): void
    {
        $this->userId = $userId;
        $this->tenantId = $tenantId;
        $this->role = $role;
    }
}
