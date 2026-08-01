<?php

namespace App\Http\Requests\TaxRate;

use App\Http\Requests\Concerns\RequiresAtLeastOneField;
use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTaxRateRequest extends FormRequest
{
    use RequiresAtLeastOneField, TrimsStringFields;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->trimFields(['name']);
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'min:1', 'max:120'],
            'percentage' => ['sometimes', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'percentage.min' => 'Percentage cannot be negative',
            'percentage.max' => 'Percentage cannot exceed 100',
            'percentage.numeric' => 'Must be a number',
        ];
    }
}
