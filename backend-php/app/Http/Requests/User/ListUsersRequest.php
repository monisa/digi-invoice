<?php

namespace App\Http\Requests\User;

use App\Http\Requests\Concerns\ListQueryDefaults;
use Illuminate\Foundation\Http\FormRequest;

class ListUsersRequest extends FormRequest
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
            'role' => ['sometimes', 'in:ADMIN,SALES_MANAGER,SALES_REP,VIEWER'],
            'status' => ['sometimes', 'in:ACTIVE,INVITED,SUSPENDED'],
        ];
    }
}
