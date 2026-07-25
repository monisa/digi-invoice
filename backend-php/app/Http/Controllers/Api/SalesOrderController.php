<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\SalesOrder\ListSalesOrdersRequest;
use App\Http\Requests\SalesOrder\UpdateSalesOrderStatusRequest;
use App\Models\Invoice;
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

        $order = SalesOrder::find($id);
        if (! $order) {
            throw ApiException::notFound('Sales order not found');
        }
        if ($order->status === 'CANCELLED') {
            throw ApiException::conflict('A cancelled order cannot be invoiced');
        }

        $invoice = DB::transaction(function () use ($order, $tenantId) {
            $invoiceNumber = QuoteNumberService::next($tenantId, 'INV');

            return Invoice::create([
                'sales_order_id' => $order->id,
                'invoice_number' => $invoiceNumber,
                'status' => 'DRAFT',
                'due_date' => now()->addDays(30),
            ]);
        });

        $invoice->load(['salesOrder:id,order_number,quote_id', 'salesOrder.quote:id,quote_number,currency,grand_total']);

        return ApiResponse::data($invoice, 201);
    }
}
