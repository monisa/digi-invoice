<?php

namespace App\Http\Requests\TaxRate;

use App\Http\Requests\Concerns\ListQueryDefaults;
use Illuminate\Foundation\Http\FormRequest;

class ListTaxRatesRequest extends FormRequest
{
    use ListQueryDefaults;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->applyListDefaults();
    }

    public function rules(): array
    {
        return $this->listRules();
    }
}
