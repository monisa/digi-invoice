<?php

namespace App\Http\Requests\ExchangeRate;

use App\Http\Requests\Concerns\RequiresAtLeastOneField;
use Illuminate\Foundation\Http\FormRequest;

class UpdateExchangeRateRequest extends FormRequest
{
    use RequiresAtLeastOneField;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rate' => ['sometimes', 'numeric', 'gt:0'],
            'effectiveDate' => ['sometimes', 'date'],
        ];
    }

    public function messages(): array
    {
        return ['rate.gt' => 'Must be greater than zero'];
    }
}
