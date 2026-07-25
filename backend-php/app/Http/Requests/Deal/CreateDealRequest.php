<?php

namespace App\Http\Requests\Deal;

use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

class CreateDealRequest extends FormRequest
{
    use TrimsStringFields;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->trimFields(['name']);

        $currency = $this->input('currency');
        if (is_string($currency)) {
            $this->merge(['currency' => strtoupper(trim($currency))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:1', 'max:200'],
            'accountId' => ['sometimes', 'uuid'],
            'stage' => ['sometimes', 'in:PROSPECTING,QUALIFICATION,PROPOSAL,NEGOTIATION,CLOSED_WON,CLOSED_LOST'],
            'amount' => ['sometimes', 'numeric'],
            'currency' => ['sometimes', 'size:3', 'alpha'],
            'expectedCloseDate' => ['sometimes', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'accountId.uuid' => 'Invalid accountId',
            'amount.numeric' => 'Must be a valid number',
            'currency.size' => 'Currency must be a 3-letter ISO code',
        ];
    }
}
