<?php

namespace App\Http\Requests\Account;

use App\Http\Requests\Concerns\RequiresAtLeastOneField;
use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAccountRequest extends FormRequest
{
    use RequiresAtLeastOneField, TrimsStringFields;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->trimFields(['name', 'industry', 'website', 'billingAddress', 'shippingAddress']);
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'min:1', 'max:200'],
            'industry' => ['sometimes', 'nullable', 'string', 'max:120'],
            'website' => ['sometimes', 'nullable', 'url', 'max:255'],
            'billingAddress' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'shippingAddress' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return ['website.url' => 'Website must be a valid URL'];
    }
}
