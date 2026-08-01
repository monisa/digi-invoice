<?php

namespace App\Http\Requests\Account;

use App\Http\Requests\Concerns\ListQueryDefaults;
use Illuminate\Foundation\Http\FormRequest;

class ListAccountsRequest extends FormRequest
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
        return $this->listRules();
    }
}
