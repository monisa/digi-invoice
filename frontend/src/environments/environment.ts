// Development environment. Swapped for environment.prod.ts in production builds
// via the fileReplacements in angular.json.
// API is backend-php (Laravel) — `php artisan serve` defaults to port 8000.
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000/api/v1',
};
