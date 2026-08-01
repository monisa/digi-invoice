<?php

namespace App\Http\Requests\User;

use App\Http\Requests\Concerns\RequiresAtLeastOneField;
use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    use RequiresAtLeastOneField, TrimsStringFields;

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
            'name' => ['sometimes', 'string', 'min:1', 'max:120'],
            'role' => ['sometimes', 'in:ADMIN,SALES_MANAGER,SALES_REP,VIEWER'],
            'status' => ['sometimes', 'in:ACTIVE,INVITED,SUSPENDED'],
            'password' => ['sometimes', 'string', 'min:8', 'max:128'],
        ];
    }

    public function messages(): array
    {
        return [
            'password.min' => 'Password must be at least 8 characters',
        ];
    }
}
