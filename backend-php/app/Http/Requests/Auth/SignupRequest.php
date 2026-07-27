<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/** Mirrors backend/src/validators/auth.validator.ts's signupSchema. */
class SignupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'subdomain' => is_string($this->subdomain) ? strtolower(trim($this->subdomain)) : $this->subdomain,
            'adminEmail' => is_string($this->adminEmail) ? strtolower(trim($this->adminEmail)) : $this->adminEmail,
        ]);
    }

    public function rules(): array
    {
        return [
            'companyName' => ['required', 'string', 'max:200'],
            'subdomain' => [
                'required', 'string', 'min:3', 'max:63',
                'regex:/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/',
            ],
            'adminName' => ['required', 'string', 'max:120'],
            'adminEmail' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'logo' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'subdomain.regex' => 'Subdomain may contain only lowercase letters, numbers and hyphens',
            'adminEmail.email' => 'A valid email is required',
            'logo.required' => 'A company logo is required',
        ];
    }
}
