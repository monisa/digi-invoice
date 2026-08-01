<?php

namespace App\Http\Requests\Contact;

use App\Http\Requests\Concerns\RequiresAtLeastOneField;
use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

class UpdateContactRequest extends FormRequest
{
    use RequiresAtLeastOneField, TrimsStringFields;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->trimFields(['name', 'phone']);

        $email = $this->input('email');
        if (is_string($email)) {
            $this->merge(['email' => strtolower(trim($email))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'min:1', 'max:160'],
            'accountId' => ['sometimes', 'nullable', 'uuid'],
            'email' => ['sometimes', 'nullable', 'email'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
        ];
    }

    public function messages(): array
    {
        return [
            'accountId.uuid' => 'Invalid accountId',
            'email.email' => 'Invalid email',
        ];
    }
}
