<?php

namespace App\Http\Requests\Deal;

use App\Http\Requests\Concerns\ListQueryDefaults;
use Illuminate\Foundation\Http\FormRequest;

class ListDealsRequest extends FormRequest
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
            'stage' => ['sometimes', 'in:PROSPECTING,QUALIFICATION,PROPOSAL,NEGOTIATION,CLOSED_WON,CLOSED_LOST'],
        ];
    }

    public function messages(): array
    {
        return ['accountId.uuid' => 'Invalid accountId'];
    }
}
