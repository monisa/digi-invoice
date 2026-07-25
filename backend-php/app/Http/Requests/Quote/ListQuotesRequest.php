<?php

namespace App\Http\Requests\Quote;

use App\Http\Requests\Concerns\ListQueryDefaults;
use Illuminate\Foundation\Http\FormRequest;

class ListQuotesRequest extends FormRequest
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
            'status' => ['sometimes', 'in:DRAFT,PENDING_APPROVAL,APPROVED,REJECTED,SENT,ACCEPTED,DECLINED,EXPIRED'],
            'ownerId' => ['sometimes', 'uuid'],
            'accountId' => ['sometimes', 'uuid'],
            'dateFrom' => ['sometimes', 'date'],
            'dateTo' => ['sometimes', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'ownerId.uuid' => 'Invalid ownerId',
            'accountId.uuid' => 'Invalid accountId',
        ];
    }
}
