<?php

namespace App\Http\Requests\ExchangeRate;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class CreateExchangeRateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['baseCurrency', 'targetCurrency'] as $field) {
            $value = $this->input($field);
            if (is_string($value)) {
                $this->merge([$field => strtoupper(trim($value))]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'baseCurrency' => ['required', 'size:3', 'alpha'],
            'targetCurrency' => ['required', 'size:3', 'alpha'],
            'rate' => ['required', 'numeric', 'gt:0'],
            'effectiveDate' => ['required', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'baseCurrency.size' => 'Currency must be a 3-letter ISO code',
            'targetCurrency.size' => 'Currency must be a 3-letter ISO code',
            'rate.gt' => 'Must be greater than zero',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->input('baseCurrency') === $this->input('targetCurrency')) {
                $validator->errors()->add('targetCurrency', 'Base and target currency must differ');
            }
        });
    }
}
