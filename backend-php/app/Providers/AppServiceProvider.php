<?php

namespace App\Providers;

use App\Support\AuthContext;
use App\Support\TenantContext;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(AuthContext::class);
        $this->app->singleton(TenantContext::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Fail fast on misconfigured JWT secrets, mirroring the zod schema
        // in backend/src/config/env.ts (min 16 chars, required).
        if ($this->app->environment() !== 'testing') {
            foreach (['jwt.access_secret', 'jwt.refresh_secret'] as $key) {
                $value = config($key);
                if (! is_string($value) || strlen($value) < 16) {
                    throw new RuntimeException("Invalid environment configuration: {$key} must be a string of >= 16 characters");
                }
            }
        }
    }
}
