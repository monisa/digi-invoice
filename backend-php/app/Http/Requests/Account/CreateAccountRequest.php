<?php

namespace App\Http\Requests\Account;

use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

class CreateAccountRequest extends FormRequest
{
    use TrimsStringFields;

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
            'name' => ['required', 'string', 'min:1', 'max:200'],
            'industry' => ['sometimes', 'string', 'max:120'],
            'website' => ['sometimes', 'url', 'max:255'],
            'billingAddress' => ['sometimes', 'string', 'max:2000'],
            'shippingAddress' => ['sometimes', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return ['website.url' => 'Website must be a valid URL'];
    }
}
