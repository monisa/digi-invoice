<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #222; }
    .doc { border: 1px solid #ccc; padding: 20px; }

    table.header-row { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    table.header-row > tr > td { padding: 0; vertical-align: top; }
    .company-block { width: 60%; }
    .company-logo { max-height: 55px; max-width: 200px; margin-bottom: 6px; }
    .company-name { font-size: 17px; font-weight: bold; margin-bottom: 3px; }
    .company-meta { font-size: 9px; color: #555; line-height: 1.5; }
    .doc-title-cell { width: 40%; text-align: right; }
    .doc-title { font-size: 26px; font-weight: bold; color: #444; letter-spacing: 1px; }

    .meta-bar { width: 100%; border: 1px solid #ddd; border-collapse: collapse; margin-bottom: 14px; font-size: 9.5px; }
    .meta-bar td { padding: 6px 10px; white-space: nowrap; }
    .meta-bar .meta-label { color: #777; }
    .meta-bar .meta-value { font-weight: bold; }

    .bill-to { margin-bottom: 14px; }
    .bill-to .label { background: #f2f2f2; padding: 4px 8px; font-size: 9px; text-transform: uppercase; color: #666; font-weight: bold; }
    .bill-to .name { padding: 6px 8px 0; font-size: 11px; font-weight: bold; }

    table.line-items { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    table.line-items th { text-align: left; font-size: 9px; background: #f2f2f2; border: 1px solid #ddd; padding: 6px 8px; text-transform: uppercase; color: #555; }
    table.line-items th.num, table.line-items td.num { text-align: right; }
    table.line-items th.idx, table.line-items td.idx { width: 24px; text-align: center; }
    table.line-items td { font-size: 9.5px; padding: 7px 8px; border: 1px solid #eee; vertical-align: top; }

    table.summary-layout { width: 100%; border-collapse: collapse; }
    table.summary-layout > tr > td { vertical-align: top; padding: 0; }
    .words-terms-cell { width: 56%; padding-right: 16px; }
    .totals-cell { width: 44%; }

    .in-words-label { font-size: 9px; color: #777; margin-bottom: 2px; }
    .in-words { font-weight: bold; font-style: italic; font-size: 9.5px; margin-bottom: 14px; }

    table.totals { width: 100%; border-collapse: collapse; }
    table.totals td { padding: 4px 6px; font-size: 9.5px; }
    table.totals td.label { color: #666; }
    table.totals td.value { text-align: right; }
    table.totals tr.grand td { font-size: 12px; font-weight: bold; border-top: 1px solid #ccc; padding-top: 7px; }

    .signature-box { margin-top: 30px; text-align: center; border-top: 1px solid #999; padding-top: 4px; font-size: 9px; color: #666; }

    .terms h3 { font-size: 9.5px; margin: 0 0 4px; text-transform: uppercase; color: #666; }
    .terms ol, .terms p { color: #444; font-size: 8.5px; margin: 0; padding-left: 14px; }
    .terms li { margin-bottom: 3px; }

    .footer { margin-top: 24px; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
</style>
</head>
<body>
<div class="doc">
    <table class="header-row">
        <tr>
            <td class="company-block">
                @if($tenantLogoDataUri)
                    <img class="company-logo" src="{{ $tenantLogoDataUri }}" alt="{{ $tenantCompanyName }}"><br>
                @endif
                <div class="company-name">{{ $tenantCompanyName }}</div>
                <div class="company-meta">
                    @if($tenantAddress){{ $tenantAddress }}<br>@endif
                    @if($tenantPhone)Phone: {{ $tenantPhone }}<br>@endif
                    @if($tenantEmail){{ $tenantEmail }}@endif
                </div>
            </td>
            <td class="doc-title-cell"><span class="doc-title">INVOICE</span></td>
        </tr>
    </table>

    <table class="meta-bar">
        <tr>
            <td class="meta-label">Invoice #</td>
            <td class="meta-value">{{ $invoice->invoice_number }}</td>
            <td class="meta-label">Date</td>
            <td class="meta-value">{{ $invoice->created_at->format('d/m/Y') }}</td>
            <td class="meta-label">Status</td>
            <td class="meta-value">{{ $invoice->status }}</td>
            @if($invoice->due_date)
                <td class="meta-label">Due</td>
                <td class="meta-value">{{ $invoice->due_date->format('d/m/Y') }}</td>
            @endif
        </tr>
    </table>

    <div class="bill-to">
        <div class="label">Bill To</div>
        <div class="name">{{ $invoice->account->name ?? '—' }}</div>
        @if($invoice->contact?->name)<div style="padding: 2px 8px;">{{ $invoice->contact->name }}</div>@endif
        @if($invoice->contact?->email)<div style="padding: 2px 8px;">{{ $invoice->contact->email }}</div>@endif
    </div>

    @if($headerHtml)
        <div style="margin: 10px 0; color: #333;">{!! $headerHtml !!}</div>
    @endif

    <table class="line-items">
        <thead>
            <tr>
                <th class="idx">#</th>
                <th>Item &amp; Description</th>
                <th class="num">Qty</th>
                <th class="num">Rate</th>
                <th class="num">Discount</th>
                <th class="num">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->lineItems as $line)
                <tr>
                    <td class="idx">{{ $loop->iteration }}</td>
                    <td>{{ $line->description ?: '—' }}</td>
                    <td class="num">{{ number_format((float) $line->quantity, 2) }}</td>
                    <td class="num">{{ number_format((float) $line->unit_price, 2) }}</td>
                    <td class="num">{{ number_format((float) $line->discount_pct, 2) }}%</td>
                    <td class="num">{{ number_format((float) $line->line_total, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="summary-layout">
        <tr>
            <td class="words-terms-cell">
                <div class="in-words-label">Total In Words</div>
                <div class="in-words">{{ $totalInWords }}</div>

                @if($termsHtml)
                    <div class="terms">
                        <h3>Terms &amp; Conditions</h3>
                        <div>{!! $termsHtml !!}</div>
                    </div>
                @endif
            </td>
            <td class="totals-cell">
                <table class="totals">
                    <tr><td class="label">Subtotal</td><td class="value">{{ number_format((float) $invoice->subtotal, 2) }} {{ $invoice->currency }}</td></tr>
                    @if((float) $invoice->discount_total > 0)
                        <tr><td class="label">Discount</td><td class="value">- {{ number_format((float) $invoice->discount_total, 2) }} {{ $invoice->currency }}</td></tr>
                    @endif
                    @if((float) $invoice->tax_total > 0)
                        <tr><td class="label">Tax</td><td class="value">{{ number_format((float) $invoice->tax_total, 2) }} {{ $invoice->currency }}</td></tr>
                    @endif
                    <tr class="grand"><td class="label">Total</td><td class="value">{{ number_format((float) $invoice->grand_total, 2) }} {{ $invoice->currency }}</td></tr>
                </table>
                <div class="signature-box">Authorized Signature</div>
            </td>
        </tr>
    </table>

    <div class="footer">{!! $footerHtml ?: 'Thank you for your business.' !!}</div>
</div>
</body>
</html>
