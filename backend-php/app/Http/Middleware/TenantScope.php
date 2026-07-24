<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use App\Support\AuthContext;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets the current tenant (from the verified JWT) so that models using
 * BelongsToTenant auto-scope. Must run AFTER jwt.auth — mirrors
 * tenantScope.middleware.ts.
 */
class TenantScope
{
    public function __construct(
        private readonly AuthContext $auth,
        private readonly TenantContext $tenant,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->auth->tenantId) {
            throw ApiException::unauthorized('No tenant context on request');
        }

        $this->tenant->set($this->auth->tenantId);

        return $next($request);
    }
}
