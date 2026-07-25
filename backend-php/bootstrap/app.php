<?php

use App\Exceptions\ApiException;
use App\Http\Middleware\JwtAuthenticate;
use App\Http\Middleware\RequireRole;
use App\Http\Middleware\TenantScope;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Behind Hostinger's proxy; needed for correct client IPs (signature
        // audit) and rate limiting on the public signing routes.
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'jwt.auth' => JwtAuthenticate::class,
            'tenant.scope' => TenantScope::class,
            'role' => RequireRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Central error handling. Translates known error types into the
        // standard { data, meta, errors } envelope — mirrors
        // backend/src/middleware/error.middleware.ts.
        $exceptions->render(fn (ApiException $e) => ApiResponse::errors($e->status, $e->errors));

        $exceptions->render(function (ValidationException $e) {
            $errors = [];
            foreach ($e->errors() as $field => $messages) {
                foreach ($messages as $message) {
                    // '_' is this app's sentinel for path-less errors (e.g. the
                    // "at least one field" refine) — omit "field" for those,
                    // matching the Node API's `field: path.join('.') || undefined`.
                    $errors[] = array_filter(
                        ['code' => 'VALIDATION_ERROR', 'message' => $message, 'field' => $field],
                        fn ($v, $k) => $k !== 'field' || $v !== '_',
                        ARRAY_FILTER_USE_BOTH,
                    );
                }
            }

            return ApiResponse::errors(422, $errors);
        });

        $exceptions->render(function (ModelNotFoundException $e) {
            return ApiResponse::errors(404, [['code' => 'NOT_FOUND', 'message' => 'Resource not found']]);
        });

        $exceptions->render(function (NotFoundHttpException $e, $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::errors(404, [['code' => 'NOT_FOUND', 'message' => 'Resource not found']]);
        });

        $exceptions->render(function (QueryException $e) {
            // MySQL error codes: 1062 duplicate key, 1451/1452 FK constraint.
            $code = $e->errorInfo[1] ?? null;

            if ($code === 1062) {
                return ApiResponse::errors(409, [[
                    'code' => 'DUPLICATE_ENTRY',
                    'message' => 'A record with this value already exists',
                ]]);
            }

            if (in_array($code, [1451, 1452], true)) {
                return ApiResponse::errors(409, [[
                    'code' => 'FK_CONSTRAINT',
                    'message' => 'Related record constraint violated',
                ]]);
            }

            return null;
        });

        $exceptions->render(function (Throwable $e, $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            report($e);

            return ApiResponse::errors(500, [[
                'code' => 'INTERNAL_ERROR',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ]]);
        });
    })->create();
