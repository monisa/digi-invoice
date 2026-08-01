<?php

namespace App\Services;

use App\Models\Quote;
use App\Models\QuoteTemplate;
use App\Support\CurrencyNames;
use App\Support\NumberToWords;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/**
 * Server-side PDF generation — mirrors backend/src/services/pdf.service.ts,
 * using dompdf (pure PHP, no headless browser, runs on Hostinger shared
 * hosting) with a Blade view instead of PDFKit's imperative drawing calls.
 * Unlike the Node version (which strips template HTML to plain text),
 * dompdf renders it directly — a strict improvement, same source data.
 */
class QuotePdfService
{
    /** @return array{binary: string, path: string} */
    public static function generate(Quote $quote): array
    {
        $quote->loadMissing([
            'lineItems', 'account:id,name', 'contact:id,name,email',
            'tenant:id,company_name,address,phone,email,logo_path',
        ]);

        $template = $quote->template_id
            ? $quote->template ?? QuoteTemplate::find($quote->template_id)
            : QuoteTemplate::where('is_default', true)->first();

        $placeholders = [
            'company_name' => $quote->tenant->company_name,
            'quote_number' => $quote->quote_number,
            'client_name' => $quote->account->name ?? '',
            'contact_name' => $quote->contact->name ?? '',
            'grand_total' => $quote->grand_total.' '.$quote->currency,
            'currency' => $quote->currency,
            'valid_until' => $quote->valid_until?->format('Y-m-d') ?? '',
        ];

        $fill = function (?string $html) use ($placeholders): ?string {
            if (! $html) {
                return null;
            }

            return preg_replace_callback(
                '/\{\{\s*(\w+)\s*\}\}/',
                fn ($m) => $placeholders[$m[1]] ?? '',
                $html,
            );
        };

        $pdf = Pdf::loadView('pdf.quote', [
            'quote' => $quote,
            'tenantCompanyName' => $quote->tenant->company_name,
            'tenantAddress' => $quote->tenant->address,
            'tenantPhone' => $quote->tenant->phone,
            'tenantEmail' => $quote->tenant->email,
            'tenantLogoDataUri' => $quote->tenant->logoDataUri(),
            'headerHtml' => $fill($template?->header_html),
            'footerHtml' => $fill($template?->footer_html),
            'termsHtml' => $fill($template?->terms_html),
            'signature' => self::signedOffData($quote),
            'totalInWords' => NumberToWords::amountToWords($quote->grand_total, CurrencyNames::nameFor($quote->currency)),
        ])->setPaper('a4');

        $binary = $pdf->output();

        $path = "pdfs/{$quote->id}.pdf";
        Storage::disk('local')->put($path, $binary);

        return ['binary' => $binary, 'path' => $path];
    }

    /**
     * The most recent signed-off signature, if any — mirrors PDF_INCLUDE's
     * signatures filter (signedAt not null, most recent) in quote.controller.ts.
     * The image is inlined as a data URI so dompdf doesn't need filesystem
     * access to storage/app/private.
     */
    private static function signedOffData(Quote $quote): ?array
    {
        $signed = $quote->signatures()->whereNotNull('signed_at')->orderByDesc('signed_at')->first();
        if (! $signed) {
            return null;
        }

        $imageDataUri = null;
        if ($signed->signature_image_path && Storage::disk('local')->exists($signed->signature_image_path)) {
            $mime = str_ends_with($signed->signature_image_path, '.jpg') ? 'image/jpeg' : 'image/png';
            $imageDataUri = 'data:'.$mime.';base64,'.base64_encode(Storage::disk('local')->get($signed->signature_image_path));
        }

        return [
            'signerName' => $signed->signer_name,
            'signerEmail' => $signed->signer_email,
            'signedAt' => $signed->signed_at?->format('Y-m-d'),
            'imagePath' => $imageDataUri,
        ];
    }
}
