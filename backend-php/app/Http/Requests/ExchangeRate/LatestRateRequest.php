<?php

namespace App\Http\Requests\ExchangeRate;

use Illuminate\Foundation\Http\FormRequest;

class LatestRateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['base', 'target'] as $field) {
            $value = $this->input($field);
            if (is_string($value)) {
                $this->merge([$field => strtoupper(trim($value))]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'base' => ['required', 'size:3', 'alpha'],
            'target' => ['required', 'size:3', 'alpha'],
        ];
    }

    public function messages(): array
    {
        return [
            'base.size' => 'Currency must be a 3-letter ISO code',
            'target.size' => 'Currency must be a 3-letter ISO code',
        ];
    }
}
