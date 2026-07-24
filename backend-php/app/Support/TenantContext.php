<?php

namespace App\Support;

/**
 * Per-request holder for the current tenant id, set by TenantScope
 * middleware. App\Models\Concerns\BelongsToTenant reads this to
 * auto-filter/auto-stamp tenant-owned models — mirrors forTenant() in the
 * original Node backend's src/lib/tenantPrisma.ts.
 */
class TenantContext
{
    private ?string $tenantId = null;

    public function set(string $tenantId): void
    {
        $this->tenantId = $tenantId;
    }

    public function id(): ?string
    {
        return $this->tenantId;
    }
}
