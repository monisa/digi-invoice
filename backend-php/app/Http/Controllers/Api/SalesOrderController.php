<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\SalesOrder\ListSalesOrdersRequest;
use App\Http\Requests\SalesOrder\UpdateSalesOrderStatusRequest;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\SalesOrder;
use App\Services\QuoteNumberService;
use App\Support\ApiResponse;
use App\Support\AuthContext;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SalesOrderController extends Controller
{
    use ValidatesUuidParam;

    public function __construct(private readonly AuthContext $auth) {}

    private const ORDER_INCLUDE = ['quote:id,quote_number,currency,grand_total,account_id', 'quote.account:id,name'];

    public function index(ListSalesOrdersRequest $request): JsonResponse
    {
        $input = $request->validated();
        $page = $input['page'] ?? 1;
        $pageSize = $input['pageSize'] ?? 20;

        $query = SalesOrder::query()->with(self::ORDER_INCLUDE);
        if (! empty($input['status'])) {
            $query->where('status', $input['status']);
        }
        if (! empty($input['search'])) {
            $query->where('order_number', 'like', '%'.$input['search'].'%');
        }

        $total = (clone $query)->count();
        $items = $query->orderByDesc('created_at')->forPage($page, $pageSize)->get();

        return ApiResponse::data($items, 200, Pagination::meta($total, $page, $pageSize));
    }

    public function show(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $order = SalesOrder::with([...self::ORDER_INCLUDE, 'invoices'])->find($id);
        if (! $order) {
            throw ApiException::notFound('Sales order not found');
        }

        return ApiResponse::data($order);
    }

    public function updateStatus(string $id, UpdateSalesOrderStatusRequest $request): JsonResponse
    {
        $this->validateUuidParam($id);

        $order = SalesOrder::find($id);
        if (! $order) {
            throw ApiException::notFound('Sales order not found');
        }

        $order->status = $request->validated()['status'];
        $order->save();

        return ApiResponse::data($order->load(self::ORDER_INCLUDE));
    }

    public function convertToInvoice(string $id): JsonResponse
    {
        $this->validateUuidParam($id);
        $tenantId = $this->auth->tenantId;

        $order = SalesOrder::with(['quote.lineItems', 'quote.account', 'quote.contact'])->find($id);
        if (! $order) {
            throw ApiException::notFound('Sales order not found');
        }
        if ($order->status === 'CANCELLED') {
            throw ApiException::conflict('A cancelled order cannot be invoiced');
        }

        $quote = $order->quote;

        $invoice = DB::transaction(function () use ($order, $quote, $tenantId) {
            $invoiceNumber = QuoteNumberService::next($tenantId, 'INV');

            $invoice = Invoice::create([
                'sales_order_id' => $order->id,
                'account_id' => $quote?->account_id,
                'contact_id' => $quote?->contact_id,
                'owner_id' => $quote?->owner_id,
                'invoice_number' => $invoiceNumber,
                'status' => 'DRAFT',
                'currency' => $quote?->currency ?? 'USD',
                'exchange_rate' => $quote?->exchange_rate ?? 1,
                'overall_discount_type' => $quote?->overall_discount_type ?? 'PERCENT',
                'overall_discount_value' => $quote?->overall_discount_value ?? 0,
                'subtotal' => $quote?->subtotal ?? 0,
                'discount_total' => $quote?->discount_total ?? 0,
                'tax_total' => $quote?->tax_total ?? 0,
                'grand_total' => $quote?->grand_total ?? 0,
                'due_date' => now()->addDays(30),
            ]);

            foreach ($quote?->lineItems ?? [] as $i => $line) {
                InvoiceLineItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $line->product_id,
                    'tax_rate_id' => $line->tax_rate_id,
                    'description' => $line->description,
                    'quantity' => $line->quantity,
                    'unit_price' => $line->unit_price,
                    'discount_pct' => $line->discount_pct,
                    'line_total' => $line->line_total,
                    'position' => $i,
                ]);
            }

            return $invoice;
        });

        $invoice->load([
            'account:id,name', 'contact:id,name,email', 'lineItems',
            'salesOrder:id,order_number,quote_id', 'salesOrder.quote:id,quote_number,currency,grand_total',
        ]);

        return ApiResponse::data($invoice, 201);
    }
}
