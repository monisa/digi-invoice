<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\QuoteTemplate;
use App\Support\CurrencyNames;
use App\Support\NumberToWords;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

/** Mirrors QuotePdfService — same template-placeholder substitution, same dompdf render. */
class InvoicePdfService
{
    /** @return array{binary: string, path: string} */
    public static function generate(Invoice $invoice): array
    {
        $invoice->loadMissing([
            'lineItems', 'account:id,name', 'contact:id,name,email',
            'tenant:id,company_name,address,phone,email,logo_path',
        ]);

        $template = $invoice->template_id
            ? $invoice->template ?? QuoteTemplate::find($invoice->template_id)
            : QuoteTemplate::whereIn('applies_to', ['INVOICE', 'BOTH'])->where('is_default', true)->first();

        $placeholders = [
            'company_name' => $invoice->tenant->company_name,
            'quote_number' => $invoice->invoice_number,
            'client_name' => $invoice->account->name ?? '',
            'contact_name' => $invoice->contact->name ?? '',
            'grand_total' => $invoice->grand_total.' '.$invoice->currency,
            'currency' => $invoice->currency,
            'valid_until' => $invoice->due_date?->format('Y-m-d') ?? '',
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

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'tenantCompanyName' => $invoice->tenant->company_name,
            'tenantAddress' => $invoice->tenant->address,
            'tenantPhone' => $invoice->tenant->phone,
            'tenantEmail' => $invoice->tenant->email,
            'tenantLogoDataUri' => $invoice->tenant->logoDataUri(),
            'headerHtml' => $fill($template?->header_html),
            'footerHtml' => $fill($template?->footer_html),
            'termsHtml' => $fill($template?->terms_html),
            'totalInWords' => NumberToWords::amountToWords($invoice->grand_total, CurrencyNames::nameFor($invoice->currency)),
        ])->setPaper('a4');

        $binary = $pdf->output();

        $path = "invoice-pdfs/{$invoice->id}.pdf";
        Storage::disk('local')->put($path, $binary);

        return ['binary' => $binary, 'path' => $path];
    }
}
