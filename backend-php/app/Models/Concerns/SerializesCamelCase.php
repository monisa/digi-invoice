<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/**
 * The Node/Prisma API returns camelCase JSON (billingAddress, tenantId,
 * createdAt, ...) because Prisma's schema fields are camelCase even though
 * this app's DB columns are conventional snake_case. Converting at the
 * serialization boundary keeps Laravel's columns idiomatic while keeping
 * the Angular frontend's contract unchanged.
 */
trait SerializesCamelCase
{
    public function toArray(): array
    {
        return $this->camelCaseKeys(parent::toArray());
    }

    private function camelCaseKeys(array $data): array
    {
        $result = [];
        foreach ($data as $key => $value) {
            $camelKey = is_string($key) ? Str::camel($key) : $key;

            if (is_array($value)) {
                $value = array_is_list($value)
                    ? array_map(fn ($v) => is_array($v) ? $this->camelCaseKeys($v) : $v, $value)
                    : $this->camelCaseKeys($value);
            }

            $result[$camelKey] = $value;
        }

        return $result;
    }
}
