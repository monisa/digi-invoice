<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\Invoice\CreateInvoiceRequest;
use App\Http\Requests\Invoice\ListInvoicesRequest;
use App\Http\Requests\Invoice\UpdateInvoiceRequest;
use App\Http\Requests\Invoice\UpdateInvoiceStatusRequest;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\Product;
use App\Models\QuoteTemplate;
use App\Models\TaxRate;
use App\Models\User;
use App\Services\InvoicePdfService;
use App\Services\QuoteCalculator;
use App\Services\QuoteNumberService;
use App\Support\ApiResponse;
use App\Support\AuthContext;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    use ValidatesUuidParam;

    /** Mirrors QuoteController::EDITABLE — invoices have no REJECTED-equivalent, so just DRAFT. */
    private const EDITABLE = ['DRAFT'];

    private const INVOICE_INCLUDE = [
        'account:id,name',
        'contact:id,name,email',
        'owner:id,name,email,role',
        'lineItems',
        'salesOrder:id,order_number,quote_id',
        'salesOrder.quote:id,quote_number,currency,grand_total,account_id',
        'salesOrder.quote.account:id,name',
    ];

    public function __construct(private readonly AuthContext $auth) {}

    public function index(ListInvoicesRequest $request): JsonResponse
    {
        $input = $request->validated();
        $page = $input['page'] ?? 1;
        $pageSize = $input['pageSize'] ?? 20;

        $query = Invoice::query()->with(self::INVOICE_INCLUDE);
        if (! empty($input['status'])) {
            $query->where('status', $input['status']);
        }
        if (! empty($input['search'])) {
            $query->where('invoice_number', 'like', '%'.$input['search'].'%');
        }

        $total = (clone $query)->count();
        $items = $query->orderByDesc('created_at')->forPage($page, $pageSize)->get();

        return ApiResponse::data($items, 200, Pagination::meta($total, $page, $pageSize));
    }

    public function show(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $invoice = Invoice::with(self::INVOICE_INCLUDE)->find($id);
        if (! $invoice) {
            throw ApiException::notFound('Invoice not found');
        }

        return ApiResponse::data($invoice);
    }

    public function store(CreateInvoiceRequest $request): JsonResponse
    {
        $input = $request->validated();
        $userId = $this->auth->userId;
        $tenantId = $this->auth->tenantId;

        $ownerId = $input['ownerId'] ?? $userId;
        $this->validateHeaderRefs([...$input, 'ownerId' => $ownerId]);

        $lineItems = $input['lineItems'] ?? [];
        $this->validateProducts(array_column($lineItems, 'productId'));
        $taxMap = $this->resolveTaxMap(array_column($lineItems, 'taxRateId'));

        $overallDiscountType = $input['overallDiscountType'] ?? 'PERCENT';
        $overallDiscountValue = $input['overallDiscountValue'] ?? 0;
        $calc = QuoteCalculator::calculate(
            $this->toCalcInputs($lineItems, $taxMap),
            $overallDiscountType,
            $overallDiscountValue,
        );

        $invoice = DB::transaction(function () use ($input, $tenantId, $ownerId, $lineItems, $overallDiscountType, $overallDiscountValue, $calc) {
            $invoiceNumber = QuoteNumberService::next($tenantId, 'INV');

            $invoice = Invoice::create([
                'invoice_number' => $invoiceNumber,
                'account_id' => $input['accountId'] ?? null,
                'contact_id' => $input['contactId'] ?? null,
                'template_id' => $input['templateId'] ?? null,
                'owner_id' => $ownerId,
                'currency' => $input['currency'] ?? 'USD',
                'exchange_rate' => $input['exchangeRate'] ?? 1,
                'due_date' => $input['dueDate'] ?? now()->addDays(30),
                'overall_discount_type' => $overallDiscountType,
                'overall_discount_value' => $overallDiscountValue,
                'subtotal' => $calc['subtotal'],
                'discount_total' => $calc['discountTotal'],
                'tax_total' => $calc['taxTotal'],
                'grand_total' => $calc['grandTotal'],
            ]);

            foreach ($lineItems as $i => $line) {
                InvoiceLineItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $line['productId'] ?? null,
                    'tax_rate_id' => $line['taxRateId'] ?? null,
                    'description' => $line['description'] ?? null,
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unitPrice'],
                    'discount_pct' => $line['discountPct'] ?? 0,
                    'line_total' => $calc['lines'][$i]['lineTotal'],
                    'position' => $i,
                ]);
            }

            return $invoice;
        });

        return ApiResponse::data(Invoice::with(self::INVOICE_INCLUDE)->find($invoice->id), 201);
    }

    public function update(string $id, UpdateInvoiceRequest $request): JsonResponse
    {
        $this->validateUuidParam($id);

        $existing = Invoice::with('lineItems')->find($id);
        if (! $existing) {
            throw ApiException::notFound('Invoice not found');
        }
        if (! in_array($existing->status, self::EDITABLE, true)) {
            throw ApiException::conflict("Invoice cannot be edited while in status {$existing->status}");
        }

        $input = $request->validated();
        $this->validateHeaderRefs($input);

        $replacingLines = array_key_exists('lineItems', $input);
        $linesForCalc = $replacingLines
            ? $input['lineItems']
            : $existing->lineItems->map(fn (InvoiceLineItem $l) => [
                'quantity' => (string) $l->quantity,
                'unitPrice' => (string) $l->unit_price,
                'discountPct' => (string) $l->discount_pct,
                'taxRateId' => $l->tax_rate_id,
            ])->all();

        if ($replacingLines) {
            $this->validateProducts(array_column($input['lineItems'], 'productId'));
        }
        $taxMap = $this->resolveTaxMap(array_column($linesForCalc, 'taxRateId'));

        $overallDiscountType = $input['overallDiscountType'] ?? $existing->overall_discount_type;
        $overallDiscountValue = $input['overallDiscountValue'] ?? (string) $existing->overall_discount_value;
        $calc = QuoteCalculator::calculate(
            $this->toCalcInputs($linesForCalc, $taxMap),
            $overallDiscountType,
            $overallDiscountValue,
        );

        DB::transaction(function () use ($existing, $input, $replacingLines, $overallDiscountType, $overallDiscountValue, $calc) {
            if ($replacingLines) {
                $existing->lineItems()->delete();
                foreach ($input['lineItems'] as $i => $line) {
                    InvoiceLineItem::create([
                        'invoice_id' => $existing->id,
                        'product_id' => $line['productId'] ?? null,
                        'tax_rate_id' => $line['taxRateId'] ?? null,
                        'description' => $line['description'] ?? null,
                        'quantity' => $line['quantity'],
                        'unit_price' => $line['unitPrice'],
                        'discount_pct' => $line['discountPct'] ?? 0,
                        'line_total' => $calc['lines'][$i]['lineTotal'],
                        'position' => $i,
                    ]);
                }
            }

            $map = [
                'accountId' => 'account_id',
                'contactId' => 'contact_id',
                'templateId' => 'template_id',
                'ownerId' => 'owner_id',
                'currency' => 'currency',
                'exchangeRate' => 'exchange_rate',
                'dueDate' => 'due_date',
            ];
            foreach ($map as $key => $column) {
                if (array_key_exists($key, $input)) {
                    $existing->{$column} = $input[$key];
                }
            }
            $existing->overall_discount_type = $overallDiscountType;
            $existing->overall_discount_value = $overallDiscountValue;
            $existing->subtotal = $calc['subtotal'];
            $existing->discount_total = $calc['discountTotal'];
            $existing->tax_total = $calc['taxTotal'];
            $existing->grand_total = $calc['grandTotal'];
            $existing->save();
        });

        return ApiResponse::data(Invoice::with(self::INVOICE_INCLUDE)->find($existing->id));
    }

    public function destroy(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $existing = Invoice::find($id);
        if (! $existing) {
            throw ApiException::notFound('Invoice not found');
        }
        if (! in_array($existing->status, self::EDITABLE, true)) {
            throw ApiException::conflict("Invoice cannot be deleted while in status {$existing->status}");
        }

        $existing->delete();

        return ApiResponse::data(['success' => true]);
    }

    public function pdf(string $id): \Illuminate\Http\Response
    {
        $this->validateUuidParam($id);

        $invoice = Invoice::find($id);
        if (! $invoice) {
            throw ApiException::notFound('Invoice not found');
        }

        $binary = InvoicePdfService::generate($invoice)['binary'];

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$invoice->invoice_number}.pdf\"",
        ]);
    }

    public function updateStatus(string $id, UpdateInvoiceStatusRequest $request): JsonResponse
    {
        $this->validateUuidParam($id);

        $invoice = Invoice::find($id);
        if (! $invoice) {
            throw ApiException::notFound('Invoice not found');
        }

        $input = $request->validated();
        $invoice->status = $input['status'];
        if (array_key_exists('dueDate', $input)) {
            $invoice->due_date = $input['dueDate'];
        }
        $invoice->save();

        return ApiResponse::data($invoice->load(self::INVOICE_INCLUDE));
    }

    /** @return array<int, array{quantity: mixed, unitPrice: mixed, discountPct: mixed, taxPct: mixed}> */
    private function toCalcInputs(array $lines, array $taxMap): array
    {
        return array_map(fn ($l) => [
            'quantity' => $l['quantity'],
            'unitPrice' => $l['unitPrice'],
            'discountPct' => $l['discountPct'] ?? 0,
            'taxPct' => ! empty($l['taxRateId']) ? ($taxMap[$l['taxRateId']] ?? 0) : 0,
        ], $lines);
    }

    /** Resolve + validate tax rates for a set of ids; returns id => percentage string. */
    private function resolveTaxMap(array $ids): array
    {
        $unique = array_values(array_unique(array_filter($ids)));
        if ($unique === []) {
            return [];
        }

        $rates = TaxRate::whereIn('id', $unique)->get(['id', 'percentage']);
        if ($rates->count() !== count($unique)) {
            throw ApiException::badRequest('One or more taxRateId values are invalid', 'lineItems.taxRateId');
        }

        return $rates->mapWithKeys(fn (TaxRate $r) => [$r->id => (string) $r->percentage])->all();
    }

    /** Validate referenced products all belong to the tenant. */
    private function validateProducts(array $ids): void
    {
        $unique = array_values(array_unique(array_filter($ids)));
        if ($unique === []) {
            return;
        }

        $found = Product::whereIn('id', $unique)->count();
        if ($found !== count($unique)) {
            throw ApiException::badRequest('One or more productId values are invalid', 'lineItems.productId');
        }
    }

    /** Validate the optional header foreign keys (account/contact/template/owner). */
    private function validateHeaderRefs(array $refs): void
    {
        $checks = [
            'accountId' => fn ($id) => Account::find($id),
            'contactId' => fn ($id) => Contact::find($id),
            'templateId' => fn ($id) => QuoteTemplate::find($id),
            'ownerId' => fn ($id) => User::find($id),
        ];
        foreach ($checks as $field => $lookup) {
            if (! empty($refs[$field]) && ! $lookup($refs[$field])) {
                throw ApiException::badRequest("{$field} does not exist", $field);
            }
        }
    }
}
