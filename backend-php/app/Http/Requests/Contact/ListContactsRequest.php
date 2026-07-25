<?php

namespace App\Http\Requests\Contact;

use App\Http\Requests\Concerns\ListQueryDefaults;
use Illuminate\Foundation\Http\FormRequest;

class ListContactsRequest extends FormRequest
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
            'accountId' => ['sometimes', 'uuid'],
        ];
    }

    public function messages(): array
    {
        return ['accountId.uuid' => 'Invalid accountId'];
    }
}
