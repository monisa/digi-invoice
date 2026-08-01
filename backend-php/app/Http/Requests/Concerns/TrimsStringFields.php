<?php

namespace App\Http\Requests\Concerns;

/** Zod's .trim() has no Laravel equivalent applied automatically on API routes. */
trait TrimsStringFields
{
    protected function trimFields(array $fields): void
    {
        $merge = [];
        foreach ($fields as $field) {
            $value = $this->input($field);
            if (is_string($value)) {
                $merge[$field] = trim($value);
            }
        }
        if ($merge !== []) {
            $this->merge($merge);
        }
    }
}
