<?php

namespace App\Http\Requests\TaxRate;

use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

class CreateTaxRateRequest extends FormRequest
{
    use TrimsStringFields;

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
            'name' => ['required', 'string', 'min:1', 'max:120'],
            'percentage' => ['required', 'numeric', 'min:0', 'max:100'],
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
