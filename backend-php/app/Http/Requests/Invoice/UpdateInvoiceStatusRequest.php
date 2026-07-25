<?php

namespace App\Http\Requests\Invoice;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInvoiceStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'in:DRAFT,ISSUED,PAID,OVERDUE,VOID'],
            'dueDate' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
