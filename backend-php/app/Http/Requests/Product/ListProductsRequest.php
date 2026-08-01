<?php

namespace App\Http\Requests\Product;

use App\Http\Requests\Concerns\ListQueryDefaults;
use Illuminate\Foundation\Http\FormRequest;

class ListProductsRequest extends FormRequest
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
        return $this->listRules() + [
            'taxRateId' => ['sometimes', 'uuid'],
        ];
    }

    public function messages(): array
    {
        return ['taxRateId.uuid' => 'Invalid taxRateId'];
    }
}
