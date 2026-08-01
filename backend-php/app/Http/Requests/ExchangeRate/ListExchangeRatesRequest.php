<?php

namespace App\Http\Requests\ExchangeRate;

use App\Http\Requests\Concerns\ListQueryDefaults;
use Illuminate\Foundation\Http\FormRequest;

class ListExchangeRatesRequest extends FormRequest
{
    use ListQueryDefaults;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->applyListDefaults();

        foreach (['baseCurrency', 'targetCurrency'] as $field) {
            $value = $this->input($field);
            if (is_string($value)) {
                $this->merge([$field => strtoupper(trim($value))]);
            }
        }
    }

    public function rules(): array
    {
        return $this->listRules() + [
            'baseCurrency' => ['sometimes', 'size:3', 'alpha'],
            'targetCurrency' => ['sometimes', 'size:3', 'alpha'],
        ];
    }
}
