<?php

namespace App\Http\Requests\Public;

use App\Http\Requests\Concerns\TrimsStringFields;
use Illuminate\Foundation\Http\FormRequest;

class SignQuoteRequest extends FormRequest
{
    use TrimsStringFields;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->trimFields(['signerName']);

        $email = $this->input('signerEmail');
        if (is_string($email)) {
            $this->merge(['signerEmail' => strtolower(trim($email))]);
        }
    }

    public function rules(): array
    {
        return [
            'signerName' => ['required', 'string', 'min:1', 'max:160'],
            'signerEmail' => ['sometimes', 'email'],
            // Optional PNG/JPEG data URL from the signature pad.
            'signatureImage' => [
                'sometimes', 'string', 'max:2000000',
                'regex:/^data:image\/(png|jpeg);base64,/',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'signerEmail.email' => 'Invalid email',
            'signatureImage.regex' => 'Invalid signature image',
        ];
    }
}
