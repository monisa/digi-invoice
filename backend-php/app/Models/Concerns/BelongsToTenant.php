<?php

namespace App\Models\Concerns;

use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;

/**
 * Tenant isolation — the single most important security boundary in the app.
 *
 * Mirrors backend/src/lib/tenantPrisma.ts's forTenant(): once TenantScope
 * middleware has set the current tenant (from the verified JWT), every query
 * on a model using this trait is automatically filtered by tenant_id, and
 * every create is automatically stamped with it.
 *
 * Before that (signup/login, which resolve/cross the tenant boundary on
 * purpose) no tenant is set and this is a no-op — those flows must filter
 * tenant_id explicitly themselves, same as the Node backend's
 * auth.service.ts using the unscoped Prisma client.
 *
 * Only models that own a tenant_id column use this. Child records without
 * their own tenant_id (line items, approvals, signatures, activity logs,
 * refresh tokens) must be reached through their tenant-scoped parent.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $tenantId = app(TenantContext::class)->id();
            if ($tenantId !== null) {
                $builder->where($builder->getModel()->getTable().'.tenant_id', $tenantId);
            }
        });

        static::creating(function ($model) {
            $tenantId = app(TenantContext::class)->id();
            if ($tenantId !== null && ! $model->tenant_id) {
                $model->tenant_id = $tenantId;
            }
        });
    }
}
