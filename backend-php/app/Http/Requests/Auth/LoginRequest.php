<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/** Mirrors backend/src/validators/auth.validator.ts's loginSchema. */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'subdomain' => is_string($this->subdomain) ? strtolower(trim($this->subdomain)) : $this->subdomain,
            'email' => is_string($this->email) ? strtolower(trim($this->email)) : $this->email,
        ]);
    }

    public function rules(): array
    {
        return [
            'subdomain' => [
                'required', 'string', 'min:3', 'max:63',
                'regex:/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/',
            ],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'subdomain.regex' => 'Subdomain may contain only lowercase letters, numbers and hyphens',
            'email.email' => 'A valid email is required',
        ];
    }
}
