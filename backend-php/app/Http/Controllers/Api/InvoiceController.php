<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\Invoice\ListInvoicesRequest;
use App\Http\Requests\Invoice\UpdateInvoiceStatusRequest;
use App\Models\Invoice;
use App\Support\ApiResponse;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;

class InvoiceController extends Controller
{
    use ValidatesUuidParam;

    private const INVOICE_INCLUDE = [
        'salesOrder:id,order_number,quote_id',
        'salesOrder.quote:id,quote_number,currency,grand_total,account_id',
        'salesOrder.quote.account:id,name',
    ];

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
}
