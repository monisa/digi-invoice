<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\DeclineQuoteRequest;
use App\Http\Requests\Public\SignQuoteRequest;
use App\Models\Quote;
use App\Models\QuoteSignature;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Public, UNAUTHENTICATED quote signing. Access is gated solely by the
 * non-guessable UUID token in the URL, which maps to exactly one quote.
 * These handlers never go through jwt.auth/tenant.scope, so BelongsToTenant's
 * global scope is naturally a no-op here (no tenant context is ever set) —
 * intentionally mirrors the Node backend's use of the unscoped Prisma client.
 * Routes are rate-limited (see routes/api.php).
 */
class PublicController extends Controller
{
    public function getQuote(string $token): JsonResponse
    {
        $quote = $this->loadQuoteByToken($token);

        return ApiResponse::data($this->publicView($quote));
    }

    public function sign(string $token, SignQuoteRequest $request): JsonResponse
    {
        $quote = $this->loadQuoteByToken($token);
        if ($quote->status !== 'SENT') {
            throw ApiException::conflict('This quote is not awaiting signature');
        }

        $input = $request->validated();
        $signaturePath = ! empty($input['signatureImage'])
            ? $this->saveSignatureImage($input['signatureImage'])
            : null;

        DB::transaction(function () use ($quote, $input, $signaturePath, $token, $request) {
            QuoteSignature::create([
                'quote_id' => $quote->id,
                'signer_name' => $input['signerName'],
                'signer_email' => $input['signerEmail'] ?? null,
                'signature_image_path' => $signaturePath,
                'ip_address' => $request->ip(),
                'public_token' => $token,
                'signed_at' => now(),
            ]);
            $quote->status = 'ACCEPTED';
            $quote->save();
            $quote->activityLog()->create([
                'action' => 'accepted',
                'details_json' => ['signerName' => $input['signerName']],
            ]);
        });

        return ApiResponse::data(['status' => 'ACCEPTED']);
    }

    public function decline(string $token, DeclineQuoteRequest $request): JsonResponse
    {
        $quote = $this->loadQuoteByToken($token);
        if ($quote->status !== 'SENT') {
            throw ApiException::conflict('This quote is not awaiting a decision');
        }

        $reason = $request->validated()['reason'] ?? null;

        DB::transaction(function () use ($quote, $reason) {
            $quote->status = 'DECLINED';
            $quote->save();
            $quote->activityLog()->create([
                'action' => 'declined',
                'details_json' => $reason ? ['reason' => $reason] : null,
            ]);
        });

        return ApiResponse::data(['status' => 'DECLINED']);
    }

    private function loadQuoteByToken(string $token): Quote
    {
        Validator::make(['token' => $token], ['token' => ['required', 'uuid']], [
            'token.required' => 'Invalid token', 'token.uuid' => 'Invalid token',
        ])->validate();

        $quote = Quote::with([
            'tenant:id,company_name',
            'account:id,name',
            'contact:id,name,email',
            'lineItems',
        ])->where('public_token', $token)->first();

        if (! $quote) {
            throw ApiException::notFound('Quote not found');
        }

        return $quote;
    }

    /** Public, read-only projection — never leak tenantId, owner, internal ids beyond the quote. */
    private function publicView(Quote $quote): array
    {
        return [
            'quoteNumber' => $quote->quote_number,
            'companyName' => $quote->tenant->company_name,
            'status' => $quote->status,
            'awaitingSignature' => $quote->status === 'SENT',
            'currency' => $quote->currency,
            'subtotal' => (string) $quote->subtotal,
            'discountTotal' => (string) $quote->discount_total,
            'taxTotal' => (string) $quote->tax_total,
            'grandTotal' => (string) $quote->grand_total,
            'validUntil' => $quote->valid_until,
            'account' => $quote->account ? ['name' => $quote->account->name] : null,
            'contact' => $quote->contact ? ['name' => $quote->contact->name, 'email' => $quote->contact->email] : null,
            'lineItems' => $quote->lineItems->map(fn ($l) => [
                'description' => $l->description,
                'quantity' => (string) $l->quantity,
                'unitPrice' => (string) $l->unit_price,
                'discountPct' => (string) $l->discount_pct,
                'lineTotal' => (string) $l->line_total,
            ])->all(),
        ];
    }

    private function saveSignatureImage(string $dataUrl): string
    {
        if (! preg_match('/^data:image\/(png|jpeg);base64,(.+)$/s', $dataUrl, $m)) {
            throw ApiException::badRequest('Invalid signature image', 'signatureImage');
        }
        [, $mime, $b64] = $m;

        $file = Str::uuid().'.'.($mime === 'jpeg' ? 'jpg' : 'png');
        $path = "signatures/{$file}";
        Storage::disk('local')->put($path, base64_decode($b64));

        return $path;
    }
}
