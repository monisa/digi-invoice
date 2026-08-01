<?php

namespace App\Http\Requests\Quote;

use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

/** Optional comments accompanying a workflow transition (submit/approve/reject/send). */
class WorkflowActionRequest extends FormRequest
{
    use TrimsStringFields;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->trimFields(['comments']);
    }

    public function rules(): array
    {
        return [
            'comments' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
