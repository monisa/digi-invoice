<?php

namespace App\Http\Requests\Product;

use App\Http\Requests\Concerns\RequiresAtLeastOneField;
use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    use RequiresAtLeastOneField, TrimsStringFields;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->trimFields(['name', 'sku', 'description']);

        $currency = $this->input('currency');
        if (is_string($currency)) {
            $this->merge(['currency' => strtoupper(trim($currency))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'min:1', 'max:200'],
            'sku' => ['sometimes', 'nullable', 'string', 'min:1', 'max:64'],
            'unitPrice' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'size:3', 'alpha'],
            'taxRateId' => ['sometimes', 'nullable', 'uuid'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'unitPrice.numeric' => 'Must be a number',
            'unitPrice.min' => 'Must be zero or greater',
            'taxRateId.uuid' => 'Invalid taxRateId',
            'currency.size' => 'Currency must be a 3-letter ISO code',
        ];
    }
}
