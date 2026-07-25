<?php

namespace App\Http\Requests\Concerns;

/** Mirrors backend/src/validators/common.validator.ts's listQuerySchema defaults. */
trait ListQueryDefaults
{
    protected function applyListDefaults(): void
    {
        $this->merge([
            'page' => $this->input('page', 1),
            'pageSize' => $this->input('pageSize', 20),
        ]);

        $search = $this->input('search');
        if (is_string($search)) {
            $this->merge(['search' => trim($search)]);
        }
    }

    protected function listRules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'pageSize' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'search' => ['sometimes', 'string', 'min:1'],
        ];
    }
}
