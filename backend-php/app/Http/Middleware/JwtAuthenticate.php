<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use App\Services\JwtService;
use App\Support\AuthContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Verifies the Bearer access token and populates AuthContext. Downstream
 * tenant scoping depends entirely on this — mirrors auth.middleware.ts.
 */
class JwtAuthenticate
{
    public function __construct(
        private readonly JwtService $jwt,
        private readonly AuthContext $auth,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization');
        if (! $header || ! str_starts_with($header, 'Bearer ')) {
            throw ApiException::unauthorized('Missing or malformed Authorization header');
        }

        $token = trim(substr($header, 7));

        try {
            $payload = $this->jwt->verifyAccessToken($token);
        } catch (Throwable) {
            throw ApiException::unauthorized('Invalid or expired access token');
        }

        $this->auth->set($payload->userId, $payload->tenantId, $payload->role);

        return $next($request);
    }
}
