<?php

namespace App\Http\Requests\SalesOrder;

use App\Http\Requests\Concerns\ListQueryDefaults;
use Illuminate\Foundation\Http\FormRequest;

class ListSalesOrdersRequest extends FormRequest
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
            'status' => ['sometimes', 'in:OPEN,FULFILLED,CANCELLED'],
        ];
    }
}
