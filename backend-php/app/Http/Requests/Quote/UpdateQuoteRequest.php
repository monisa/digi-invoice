<?php

namespace App\Http\Requests\Quote;

use App\Http\Requests\Concerns\RequiresAtLeastOneField;
use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

class UpdateQuoteRequest extends FormRequest
{
    use RequiresAtLeastOneField, TrimsStringFields;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $currency = $this->input('currency');
        if (is_string($currency)) {
            $this->merge(['currency' => strtoupper(trim($currency))]);
        }
    }

    public function rules(): array
    {
        return [
            'accountId' => ['sometimes', 'nullable', 'uuid'],
            'contactId' => ['sometimes', 'nullable', 'uuid'],
            'dealId' => ['sometimes', 'nullable', 'uuid'],
            'templateId' => ['sometimes', 'nullable', 'uuid'],
            'ownerId' => ['sometimes', 'nullable', 'uuid'],
            'currency' => ['sometimes', 'size:3', 'alpha'],
            'exchangeRate' => ['sometimes', 'numeric', 'gt:0'],
            'validUntil' => ['sometimes', 'nullable', 'date'],
            'overallDiscountType' => ['sometimes', 'in:PERCENT,AMOUNT'],
            'overallDiscountValue' => ['sometimes', 'numeric', 'min:0'],
            // When provided, line items are fully replaced and totals recomputed.
            'lineItems' => ['sometimes', 'array'],
            'lineItems.*.productId' => ['sometimes', 'uuid'],
            'lineItems.*.description' => ['sometimes', 'string', 'max:2000'],
            'lineItems.*.quantity' => ['required', 'numeric', 'gt:0'],
            'lineItems.*.unitPrice' => ['required', 'numeric', 'min:0'],
            'lineItems.*.discountPct' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'lineItems.*.taxRateId' => ['sometimes', 'uuid'],
        ];
    }

    public function messages(): array
    {
        return [
            'accountId.uuid' => 'Invalid accountId',
            'contactId.uuid' => 'Invalid contactId',
            'dealId.uuid' => 'Invalid dealId',
            'templateId.uuid' => 'Invalid templateId',
            'ownerId.uuid' => 'Invalid ownerId',
            'currency.size' => 'Currency must be a 3-letter ISO code',
            'exchangeRate.gt' => 'Must be greater than zero',
            'lineItems.*.quantity.required' => 'Quantity is required',
            'lineItems.*.quantity.gt' => 'Must be greater than zero',
            'lineItems.*.unitPrice.required' => 'Unit price is required',
            'lineItems.*.unitPrice.min' => 'Must be zero or greater',
            'lineItems.*.taxRateId.uuid' => 'Invalid taxRateId',
            'lineItems.*.productId.uuid' => 'Invalid productId',
        ];
    }
}
