<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use App\Support\AuthContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route-level RBAC mirroring the frontend RoleGuard. Use after jwt.auth:
 *   Route::middleware(['jwt.auth', 'tenant.scope', 'role:ADMIN,SALES_MANAGER'])
 */
class RequireRole
{
    public function __construct(private readonly AuthContext $auth) {}

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (! $this->auth->role) {
            throw ApiException::unauthorized();
        }

        if (! in_array($this->auth->role, $roles, true)) {
            throw ApiException::forbidden();
        }

        return $next($request);
    }
}
