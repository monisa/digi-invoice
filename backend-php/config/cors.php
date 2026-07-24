<?php

return [

    /*
    |--------------------------------------------------------------------------
    | CORS — allow the Angular app's origin(s) only
    |--------------------------------------------------------------------------
    |
    | Mirrors the Node backend's CORS_ORIGINS env var (comma-separated).
    | credentials:true is required because the frontend sends the JWT via
    | an Authorization header on cross-origin requests.
    |
    */

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:6060')),
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
