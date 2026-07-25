<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Contracts\Validation\Validator;

/** Mirrors the `.refine((v) => Object.keys(v).length > 0)` on update schemas. */
trait RequiresAtLeastOneField
{
    abstract public function rules(): array;

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $present = array_intersect_key($this->all(), $this->rules());
            if ($present === []) {
                $validator->errors()->add('_', 'At least one field must be provided');
            }
        });
    }
}
