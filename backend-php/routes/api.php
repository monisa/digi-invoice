<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\DealController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\TaxRateController;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

/**
 * API v1 root router (apiPrefix set to 'api/v1' in bootstrap/app.php).
 * Resource routers (users, quotes, ...) are mounted here in subsequent
 * build slices, protected by ['jwt.auth', 'tenant.scope'].
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

// Roles permitted to mutate CRM data (Viewer is read-only) — mirrors
// backend/src/routes/{account,contact,deal}.routes.ts's WRITE constant.
$crmWrite = 'role:ADMIN,SALES_MANAGER,SALES_REP';

foreach ([
    'accounts' => AccountController::class,
    'contacts' => ContactController::class,
    'deals' => DealController::class,
] as $prefix => $controller) {
    Route::prefix($prefix)->middleware(['jwt.auth', 'tenant.scope'])->group(function () use ($controller, $crmWrite) {
        Route::get('/', [$controller, 'index']);
        Route::post('/', [$controller, 'store'])->middleware($crmWrite);
        Route::get('/{id}', [$controller, 'show']);
        Route::put('/{id}', [$controller, 'update'])->middleware($crmWrite);
        Route::delete('/{id}', [$controller, 'destroy'])->middleware($crmWrite);
    });
}

// Catalog/pricing config is restricted to admins and sales managers —
// mirrors backend/src/routes/{product,taxRate}.routes.ts's MANAGE constant.
$catalogManage = 'role:ADMIN,SALES_MANAGER';

foreach ([
    'products' => ProductController::class,
    'tax-rates' => TaxRateController::class,
] as $prefix => $controller) {
    Route::prefix($prefix)->middleware(['jwt.auth', 'tenant.scope'])->group(function () use ($controller, $catalogManage) {
        Route::get('/', [$controller, 'index']);
        Route::post('/', [$controller, 'store'])->middleware($catalogManage);
        Route::get('/{id}', [$controller, 'show']);
        Route::put('/{id}', [$controller, 'update'])->middleware($catalogManage);
        Route::delete('/{id}', [$controller, 'destroy'])->middleware($catalogManage);
    });
}

// Quotes: CRUD only in this slice — workflow transitions (submit/approve/
// reject/send), PDF, signing-link and convert-to-order land in later slices.
// Mirrors backend/src/routes/quote.routes.ts's WRITE constant.
Route::prefix('quotes')->middleware(['jwt.auth', 'tenant.scope'])->group(function () use ($crmWrite) {
    Route::get('/', [QuoteController::class, 'index']);
    Route::post('/', [QuoteController::class, 'store'])->middleware($crmWrite);
    Route::get('/{id}', [QuoteController::class, 'show']);
    Route::put('/{id}', [QuoteController::class, 'update'])->middleware($crmWrite);
    Route::delete('/{id}', [QuoteController::class, 'destroy'])->middleware($crmWrite);
});

// --- Resource routers (added per slice) -------------------------------------
// Route::middleware(['jwt.auth', 'tenant.scope'])->group(function () { ... });
