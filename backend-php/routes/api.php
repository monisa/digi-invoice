<?php

use App\Http\Controllers\Api\AuthController;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

/**
 * API v1 root router (apiPrefix set to 'api/v1' in bootstrap/app.php).
 * Resource routers (users, accounts, quotes, ...) are mounted here in
 * subsequent build slices, protected by ['jwt.auth', 'tenant.scope'].
 */

// Liveness/readiness probe — unauthenticated.
Route::get('/health', fn () => ApiResponse::data(['status' => 'ok', 'time' => now()->toIso8601String()]));

// Public auth endpoints (no JWT required).
Route::prefix('auth')->group(function () {
    Route::post('/signup', [AuthController::class, 'signup']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

// --- Resource routers (added per slice) -------------------------------------
// Route::middleware(['jwt.auth', 'tenant.scope'])->group(function () {
//     Route::apiResource('accounts', AccountController::class);
//     ...
// });
