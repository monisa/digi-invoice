<?php

return [

    /*
    |--------------------------------------------------------------------------
    | JWT secrets & lifetimes
    |--------------------------------------------------------------------------
    |
    | Separate secrets for access vs refresh tokens, same split as the
    | original Node backend (backend/src/config/env.ts).
    |
    */

    'access_secret' => env('JWT_ACCESS_SECRET'),
    'refresh_secret' => env('JWT_REFRESH_SECRET'),

    'access_ttl_minutes' => (int) env('JWT_ACCESS_TTL_MINUTES', 15),
    'refresh_ttl_minutes' => (int) env('JWT_REFRESH_TTL_MINUTES', 60 * 24 * 7),

    'algo' => 'HS256',

];
