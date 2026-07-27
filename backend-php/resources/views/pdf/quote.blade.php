<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #000; }
    .header-row { width: 100%; overflow: hidden; margin-bottom: 20px; }
    .company-name { float: left; font-size: 20px; font-weight: bold; }
    .company-logo { float: left; max-height: 50px; max-width: 200px; }
    .quote-meta { float: right; text-align: right; font-size: 10px; }
    .quote-meta .title { font-size: 16px; color: #555; margin-bottom: 4px; }
    .bill-to { margin: 24px 0; }
    .bill-to h3 { font-size: 11px; margin: 0 0 4px; }
    .bill-to p { margin: 0; color: #333; }
    .template-section { margin: 16px 0; color: #333; }
    table.line-items { width: 100%; border-collapse: collapse; margin-top: 16px; }
    table.line-items th { text-align: left; font-size: 9px; border-bottom: 1px solid #ccc; padding: 4px 6px; }
    table.line-items th.num, table.line-items td.num { text-align: right; }
    table.line-items td { font-size: 9px; padding: 6px; border-bottom: 1px solid #eee; }
    table.totals { width: 260px; margin-left: auto; margin-top: 12px; }
    table.totals td { padding: 3px 0; font-size: 9px; }
    table.totals td.label { width: 140px; }
    table.totals td.value { text-align: right; }
    table.totals tr.grand td { font-size: 11px; font-weight: bold; border-top: 1px solid #ccc; padding-top: 6px; }
    .terms h3 { font-size: 10px; margin: 0 0 4px; }
    .terms p { color: #444; font-size: 9px; }
    .signature { margin-top: 24px; }
    .signature h3 { font-size: 10px; margin: 0 0 8px; }
    .signature img { max-width: 200px; max-height: 70px; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8px; color: #999; }
</style>
</head>
<body>
    <div class="header-row">
        @if($tenantLogoDataUri)
            <img class="company-logo" src="{{ $tenantLogoDataUri }}" alt="{{ $tenantCompanyName }}">
        @else
            <div class="company-name">{{ $tenantCompanyName }}</div>
        @endif
        <div class="quote-meta">
            <div class="title">QUOTE</div>
            <div>Quote #: {{ $quote->quote_number }}</div>
            <div>Status: {{ $quote->status }}</div>
            <div>Date: {{ $quote->created_at->format('Y-m-d') }}</div>
            @if($quote->valid_until)
                <div>Valid until: {{ $quote->valid_until->format('Y-m-d') }}</div>
            @endif
        </div>
    </div>

    <div class="bill-to">
        <h3>Bill to</h3>
        <p>{{ $quote->account->name ?? '—' }}</p>
        @if($quote->contact?->name)<p>{{ $quote->contact->name }}</p>@endif
        @if($quote->contact?->email)<p>{{ $quote->contact->email }}</p>@endif
    </div>

    @if($headerHtml)
        <div class="template-section">{!! $headerHtml !!}</div>
    @endif

    <table class="line-items">
        <thead>
            <tr>
                <th>Description</th>
                <th class="num">Qty</th>
                <th class="num">Unit</th>
                <th class="num">Disc%</th>
                <th class="num">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($quote->lineItems as $line)
                <tr>
                    <td>{{ $line->description ?: '—' }}</td>
                    <td class="num">{{ $line->quantity }}</td>
                    <td class="num">{{ $line->unit_price }}</td>
                    <td class="num">{{ $line->discount_pct }}</td>
                    <td class="num">{{ $line->line_total }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr><td class="label">Subtotal</td><td class="value">{{ $quote->subtotal }} {{ $quote->currency }}</td></tr>
        <tr><td class="label">Discount</td><td class="value">- {{ $quote->discount_total }} {{ $quote->currency }}</td></tr>
        <tr><td class="label">Tax</td><td class="value">{{ $quote->tax_total }} {{ $quote->currency }}</td></tr>
        <tr class="grand"><td class="label">Grand total</td><td class="value">{{ $quote->grand_total }} {{ $quote->currency }}</td></tr>
    </table>

    @if($termsHtml)
        <div class="terms">
            <h3>Terms</h3>
            <div>{!! $termsHtml !!}</div>
        </div>
    @endif

    @if($signature)
        <div class="signature">
            <h3>Accepted &amp; signed</h3>
            @if($signature['imagePath'] ?? null)
                <img src="{{ $signature['imagePath'] }}">
            @endif
            <p>Signed by: {{ $signature['signerName'] }}</p>
            @if($signature['signerEmail'] ?? null)<p>Email: {{ $signature['signerEmail'] }}</p>@endif
            @if($signature['signedAt'] ?? null)<p>Date: {{ $signature['signedAt'] }}</p>@endif
        </div>
    @endif

    <div class="footer">{!! $footerHtml ?: 'Thank you for your business.' !!}</div>
</body>
</html>
