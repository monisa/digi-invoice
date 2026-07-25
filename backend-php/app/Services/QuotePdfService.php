<?php

namespace App\Services;

use App\Models\Quote;
use App\Models\QuoteTemplate;
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
            'lineItems', 'account:id,name', 'contact:id,name,email', 'tenant:id,company_name',
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
            'headerHtml' => $fill($template?->header_html),
            'footerHtml' => $fill($template?->footer_html),
            'termsHtml' => $fill($template?->terms_html),
            // Populated once quote_signatures exists (slice 6).
            'signature' => null,
        ])->setPaper('a4');

        $binary = $pdf->output();

        $path = "pdfs/{$quote->id}.pdf";
        Storage::disk('local')->put($path, $binary);

        return ['binary' => $binary, 'path' => $path];
    }
}
