<?php

namespace App\Http\Requests\Invoice;

use App\Http\Requests\Concerns\ListQueryDefaults;
use Illuminate\Foundation\Http\FormRequest;

class ListInvoicesRequest extends FormRequest
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
            'status' => ['sometimes', 'in:DRAFT,ISSUED,PAID,OVERDUE,VOID'],
        ];
    }
}
