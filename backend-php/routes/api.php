<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\DealController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\QuoteTemplateController;
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

// Quotes: CRUD + PDF + workflow transitions in this slice — convert-to-order
// lands in slice 7. Mirrors backend/src/routes/quote.routes.ts's WRITE/APPROVE
// constants (approve/reject are manager+ only; everything else any writer).
$quoteApprove = 'role:ADMIN,SALES_MANAGER';

Route::prefix('quotes')->middleware(['jwt.auth', 'tenant.scope'])->group(function () use ($crmWrite, $quoteApprove) {
    Route::get('/', [QuoteController::class, 'index']);
    Route::post('/', [QuoteController::class, 'store'])->middleware($crmWrite);
    Route::get('/{id}', [QuoteController::class, 'show']);
    Route::get('/{id}/pdf', [QuoteController::class, 'pdf']);
    Route::put('/{id}', [QuoteController::class, 'update'])->middleware($crmWrite);
    Route::delete('/{id}', [QuoteController::class, 'destroy'])->middleware($crmWrite);

    Route::post('/{id}/submit-for-approval', [QuoteController::class, 'submitForApproval'])->middleware($crmWrite);
    Route::post('/{id}/approve', [QuoteController::class, 'approve'])->middleware($quoteApprove);
    Route::post('/{id}/reject', [QuoteController::class, 'reject'])->middleware($quoteApprove);
    Route::post('/{id}/send', [QuoteController::class, 'send'])->middleware($crmWrite);
    Route::post('/{id}/signing-link', [QuoteController::class, 'signingLink'])->middleware($crmWrite);
});

// Quote templates restricted to admins and sales managers — mirrors
// backend/src/routes/quoteTemplate.routes.ts's MANAGE constant.
Route::prefix('quote-templates')->middleware(['jwt.auth', 'tenant.scope'])->group(function () use ($catalogManage) {
    Route::get('/', [QuoteTemplateController::class, 'index']);
    Route::post('/', [QuoteTemplateController::class, 'store'])->middleware($catalogManage);
    Route::get('/{id}', [QuoteTemplateController::class, 'show']);
    Route::put('/{id}', [QuoteTemplateController::class, 'update'])->middleware($catalogManage);
    Route::delete('/{id}', [QuoteTemplateController::class, 'destroy'])->middleware($catalogManage);
});

// Public, unauthenticated, token-gated quote signing — access is gated
// solely by the non-guessable UUID token in the URL. Rate-limited per IP
// (30/min) to blunt token guessing/abuse — mirrors public.routes.ts.
Route::prefix('public')->middleware('throttle:30,1')->group(function () {
    Route::get('/quotes/{token}', [PublicController::class, 'getQuote']);
    Route::post('/quotes/{token}/sign', [PublicController::class, 'sign']);
    Route::post('/quotes/{token}/decline', [PublicController::class, 'decline']);
});

// --- Resource routers (added per slice) -------------------------------------
// Route::middleware(['jwt.auth', 'tenant.scope'])->group(function () { ... });
