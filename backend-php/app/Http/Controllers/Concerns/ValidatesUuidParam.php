<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Facades\Validator;

/**
 * Mirrors backend/src/validators/common.validator.ts's idParamSchema: a
 * malformed id is a 422 VALIDATION_ERROR (via the app-wide ValidationException
 * renderer), distinct from a well-formed id that simply isn't found (404).
 */
trait ValidatesUuidParam
{
    protected function validateUuidParam(string $value, string $field = 'id'): void
    {
        Validator::make(
            [$field => $value],
            [$field => ['required', 'uuid']],
            ["{$field}.required" => "Invalid {$field}", "{$field}.uuid" => "Invalid {$field}"],
        )->validate();
    }
}
