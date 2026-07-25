<?php

namespace App\Http\Requests\QuoteTemplate;

use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

class CreateQuoteTemplateRequest extends FormRequest
{
    use TrimsStringFields;

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
            'name' => ['required', 'string', 'min:1', 'max:160'],
            'headerHtml' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'footerHtml' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'termsHtml' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'isDefault' => ['sometimes', 'boolean'],
        ];
    }
}
