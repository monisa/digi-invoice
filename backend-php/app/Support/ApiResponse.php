<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * Consistent response envelope: { data, meta, errors }, matching the
 * original Node API exactly so the Angular frontend needs no changes.
 */
class ApiResponse
{
    public static function data(mixed $data, int $status = 200, ?array $meta = null): JsonResponse
    {
        return response()->json([
            'data' => $data,
            'meta' => $meta,
            'errors' => null,
        ], $status);
    }

    public static function errors(int $status, array $errors): JsonResponse
    {
        return response()->json([
            'data' => null,
            'meta' => null,
            'errors' => $errors,
        ], $status);
    }
}
