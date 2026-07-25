<?php

namespace App\Http\Requests\User;

use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

class CreateUserRequest extends FormRequest
{
    use TrimsStringFields;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->trimFields(['name']);

        $email = $this->input('email');
        if (is_string($email)) {
            $this->merge(['email' => strtolower(trim($email))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:1', 'max:120'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'role' => ['sometimes', 'in:ADMIN,SALES_MANAGER,SALES_REP,VIEWER'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.email' => 'A valid email is required',
            'password.min' => 'Password must be at least 8 characters',
        ];
    }
}
