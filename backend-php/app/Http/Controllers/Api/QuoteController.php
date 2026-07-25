<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\Quote\CreateQuoteRequest;
use App\Http\Requests\Quote\ListQuotesRequest;
use App\Http\Requests\Quote\UpdateQuoteRequest;
use App\Http\Requests\Quote\WorkflowActionRequest;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Product;
use App\Models\Quote;
use App\Models\QuoteApproval;
use App\Models\QuoteLineItem;
use App\Models\QuoteTemplate;
use App\Models\SalesOrder;
use App\Models\TaxRate;
use App\Models\User;
use App\Services\QuoteCalculator;
use App\Services\QuoteEmailService;
use App\Services\QuoteNumberService;
use App\Services\QuotePdfService;
use App\Support\ApiResponse;
use App\Support\AuthContext;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class QuoteController extends Controller
{
    use ValidatesUuidParam;

    /** Quotes may only be edited while in these statuses. */
    private const EDITABLE = ['DRAFT', 'REJECTED'];

    public function __construct(private readonly AuthContext $auth) {}

    public function index(ListQuotesRequest $request): JsonResponse
    {
        $input = $request->validated();
        $page = $input['page'] ?? 1;
        $pageSize = $input['pageSize'] ?? 20;

        $query = Quote::query()->with([
            'owner:id,name',
            'account:id,name',
        ]);
        if (! empty($input['status'])) {
            $query->where('status', $input['status']);
        }
        if (! empty($input['ownerId'])) {
            $query->where('owner_id', $input['ownerId']);
        }
        if (! empty($input['accountId'])) {
            $query->where('account_id', $input['accountId']);
        }
        if (! empty($input['search'])) {
            $query->where('quote_number', 'like', '%'.$input['search'].'%');
        }
        if (! empty($input['dateFrom'])) {
            $query->where('created_at', '>=', $input['dateFrom']);
        }
        if (! empty($input['dateTo'])) {
            $query->where('created_at', '<=', $input['dateTo']);
        }

        $total = (clone $query)->count();
        $items = $query->orderByDesc('created_at')->forPage($page, $pageSize)->get();

        return ApiResponse::data($items, 200, Pagination::meta($total, $page, $pageSize));
    }

    public function show(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $quote = $this->quoteWithFullDetail()->find($id);
        if (! $quote) {
            throw ApiException::notFound('Quote not found');
        }

        return ApiResponse::data($quote);
    }

    public function store(CreateQuoteRequest $request): JsonResponse
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

        $quote = DB::transaction(function () use ($input, $tenantId, $userId, $ownerId, $lineItems, $overallDiscountType, $overallDiscountValue, $calc) {
            $quoteNumber = QuoteNumberService::next($tenantId, 'QT');

            $quote = Quote::create([
                'quote_number' => $quoteNumber,
                'account_id' => $input['accountId'] ?? null,
                'contact_id' => $input['contactId'] ?? null,
                'deal_id' => $input['dealId'] ?? null,
                'template_id' => $input['templateId'] ?? null,
                'owner_id' => $ownerId,
                'currency' => $input['currency'] ?? 'USD',
                'exchange_rate' => $input['exchangeRate'] ?? 1,
                'valid_until' => $input['validUntil'] ?? null,
                'overall_discount_type' => $overallDiscountType,
                'overall_discount_value' => $overallDiscountValue,
                'subtotal' => $calc['subtotal'],
                'discount_total' => $calc['discountTotal'],
                'tax_total' => $calc['taxTotal'],
                'grand_total' => $calc['grandTotal'],
            ]);

            foreach ($lineItems as $i => $line) {
                QuoteLineItem::create([
                    'quote_id' => $quote->id,
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

            $quote->activityLog()->create([
                'user_id' => $userId,
                'action' => 'created',
                'details_json' => ['grandTotal' => $calc['grandTotal']],
            ]);

            return $quote;
        });

        return ApiResponse::data($this->quoteWithFullDetail()->find($quote->id), 201);
    }

    public function update(string $id, UpdateQuoteRequest $request): JsonResponse
    {
        $this->validateUuidParam($id);
        $userId = $this->auth->userId;

        $existing = Quote::with('lineItems')->find($id);
        if (! $existing) {
            throw ApiException::notFound('Quote not found');
        }
        if (! in_array($existing->status, self::EDITABLE, true)) {
            throw ApiException::conflict("Quote cannot be edited while in status {$existing->status}");
        }

        $input = $request->validated();
        $this->validateHeaderRefs($input);

        // Determine the line set to price: the new one if supplied, else existing.
        $replacingLines = array_key_exists('lineItems', $input);
        $linesForCalc = $replacingLines
            ? $input['lineItems']
            : $existing->lineItems->map(fn (QuoteLineItem $l) => [
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

        DB::transaction(function () use ($existing, $input, $userId, $replacingLines, $overallDiscountType, $overallDiscountValue, $calc) {
            if ($replacingLines) {
                $existing->lineItems()->delete();
                foreach ($input['lineItems'] as $i => $line) {
                    QuoteLineItem::create([
                        'quote_id' => $existing->id,
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
                'dealId' => 'deal_id',
                'templateId' => 'template_id',
                'ownerId' => 'owner_id',
                'currency' => 'currency',
                'exchangeRate' => 'exchange_rate',
                'validUntil' => 'valid_until',
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

            $existing->activityLog()->create([
                'user_id' => $userId,
                'action' => 'updated',
                'details_json' => ['grandTotal' => $calc['grandTotal']],
            ]);
        });

        return ApiResponse::data($this->quoteWithFullDetail()->find($existing->id));
    }

    public function pdf(string $id): \Illuminate\Http\Response
    {
        $this->validateUuidParam($id);

        $quote = Quote::find($id);
        if (! $quote) {
            throw ApiException::notFound('Quote not found');
        }

        $binary = QuotePdfService::generate($quote)['binary'];

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "inline; filename=\"{$quote->quote_number}.pdf\"",
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->validateUuidParam($id);
        $userId = $this->auth->userId;

        $existing = Quote::find($id);
        if (! $existing) {
            throw ApiException::notFound('Quote not found');
        }

        DB::transaction(function () use ($existing, $userId) {
            $existing->delete();
            $existing->activityLog()->create([
                'user_id' => $userId,
                'action' => 'deleted',
                'details_json' => null,
            ]);
        });

        return ApiResponse::data(['success' => true]);
    }

    // --- Workflow transitions ------------------------------------------------
    // State machine:
    //   DRAFT|REJECTED --submit--> PENDING_APPROVAL
    //   PENDING_APPROVAL --approve--> APPROVED   (managers/admins)
    //   PENDING_APPROVAL --reject--> REJECTED    (managers/admins)
    //   APPROVED|DRAFT --send--> SENT

    public function submitForApproval(string $id, WorkflowActionRequest $request): JsonResponse
    {
        $quote = $this->loadQuoteForTransition($id, ['DRAFT', 'REJECTED'], 'submitted for approval');
        $userId = $this->auth->userId;
        $comments = $request->validated()['comments'] ?? null;

        DB::transaction(function () use ($quote, $userId, $comments) {
            QuoteApproval::create([
                'quote_id' => $quote->id,
                'requested_by' => $userId,
                'status' => 'PENDING',
                'comments' => $comments,
            ]);
            $quote->status = 'PENDING_APPROVAL';
            $quote->save();
            $quote->activityLog()->create([
                'user_id' => $userId,
                'action' => 'submitted_for_approval',
                'details_json' => $comments ? ['comments' => $comments] : null,
            ]);
        });

        return ApiResponse::data($this->quoteWithFullDetail()->find($quote->id));
    }

    public function approve(string $id, WorkflowActionRequest $request): JsonResponse
    {
        return ApiResponse::data($this->actOnApproval($id, $request, 'APPROVED'));
    }

    public function reject(string $id, WorkflowActionRequest $request): JsonResponse
    {
        return ApiResponse::data($this->actOnApproval($id, $request, 'REJECTED'));
    }

    public function send(string $id): JsonResponse
    {
        $quote = $this->loadQuoteForTransition($id, ['APPROVED', 'DRAFT'], 'sent');
        $userId = $this->auth->userId;

        $full = Quote::with(['lineItems', 'account:id,name', 'contact:id,name,email', 'tenant:id,company_name'])
            ->find($quote->id);
        $pdf = QuotePdfService::generate($full);

        $recipient = $full->contact->email ?? null;
        $email = $recipient
            ? QuoteEmailService::sendQuote($recipient, $full->tenant->company_name, $full->quote_number, $pdf['binary'])
            : ['sent' => false, 'skipped' => true, 'reason' => 'no recipient email'];

        // Ensure a non-guessable signing token exists for the public link.
        $publicToken = $full->public_token ?? (string) Str::uuid();

        DB::transaction(function () use ($full, $userId, $publicToken, $recipient, $email) {
            $full->status = 'SENT';
            $full->public_token = $publicToken;
            $full->save();
            $full->activityLog()->create([
                'user_id' => $userId,
                'action' => 'sent',
                'details_json' => array_merge(['emailedTo' => $recipient], $email),
            ]);
        });

        return ApiResponse::data($this->quoteWithFullDetail()->find($full->id));
    }

    public function signingLink(string $id): JsonResponse
    {
        $this->validateUuidParam($id);
        $quote = Quote::find($id);
        if (! $quote) {
            throw ApiException::notFound('Quote not found');
        }

        $token = $quote->public_token;
        if (! $token) {
            $token = (string) Str::uuid();
            $quote->public_token = $token;
            $quote->save();
        }

        return ApiResponse::data(['token' => $token]);
    }

    public function convertToOrder(string $id): JsonResponse
    {
        $this->validateUuidParam($id);
        $tenantId = $this->auth->tenantId;
        $userId = $this->auth->userId;

        $quote = Quote::find($id);
        if (! $quote) {
            throw ApiException::notFound('Quote not found');
        }
        if (! in_array($quote->status, ['ACCEPTED', 'APPROVED'], true)) {
            throw ApiException::conflict("A {$quote->status} quote cannot be converted to an order");
        }
        if (SalesOrder::where('quote_id', $quote->id)->exists()) {
            throw ApiException::conflict('This quote has already been converted to an order');
        }

        $order = DB::transaction(function () use ($quote, $tenantId, $userId) {
            $orderNumber = QuoteNumberService::next($tenantId, 'SO');

            $created = SalesOrder::create([
                'quote_id' => $quote->id,
                'order_number' => $orderNumber,
                'status' => 'OPEN',
            ]);

            $quote->activityLog()->create([
                'user_id' => $userId,
                'action' => 'converted_to_order',
                'details_json' => ['orderNumber' => $orderNumber],
            ]);

            return $created;
        });

        return ApiResponse::data($order->load('quote:id,quote_number,currency,grand_total'), 201);
    }

    /** Load a tenant-scoped, non-deleted quote and assert it's in an allowed status. */
    private function loadQuoteForTransition(string $id, array $allowed, string $verb): Quote
    {
        $this->validateUuidParam($id);
        $quote = Quote::find($id);
        if (! $quote) {
            throw ApiException::notFound('Quote not found');
        }
        if (! in_array($quote->status, $allowed, true)) {
            throw ApiException::conflict("A {$quote->status} quote cannot be {$verb}");
        }

        return $quote;
    }

    /** Approve or reject the pending approval and transition the quote. */
    private function actOnApproval(string $id, WorkflowActionRequest $request, string $decision): Quote
    {
        $verb = $decision === 'APPROVED' ? 'approved' : 'rejected';
        $quote = $this->loadQuoteForTransition($id, ['PENDING_APPROVAL'], $verb);
        $userId = $this->auth->userId;
        $comments = $request->validated()['comments'] ?? null;

        return DB::transaction(function () use ($quote, $userId, $comments, $decision) {
            $pending = QuoteApproval::where('quote_id', $quote->id)->where('status', 'PENDING')
                ->orderByDesc('created_at')->first();

            if ($pending) {
                $pending->status = $decision;
                $pending->approver_id = $userId;
                $pending->comments = $comments ?? $pending->comments;
                $pending->acted_at = now();
                $pending->save();
            } else {
                QuoteApproval::create([
                    'quote_id' => $quote->id,
                    'requested_by' => $userId,
                    'approver_id' => $userId,
                    'status' => $decision,
                    'comments' => $comments,
                    'acted_at' => now(),
                ]);
            }

            $quote->status = $decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
            $quote->save();

            $quote->activityLog()->create([
                'user_id' => $userId,
                'action' => $decision === 'APPROVED' ? 'approved' : 'rejected',
                'details_json' => $comments ? ['comments' => $comments] : null,
            ]);

            return $this->quoteWithFullDetail()->find($quote->id);
        });
    }

    private function quoteWithFullDetail()
    {
        return Quote::with([
            'lineItems',
            'account',
            'contact',
            'owner:id,name,email,role',
            'activityLog',
            'approvals.requester:id,name',
            'approvals.approver:id,name',
            'signatures:id,quote_id,signer_name,signer_email,signed_at',
        ]);
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

    /** Validate the optional header foreign keys (account/contact/deal/owner). */
    private function validateHeaderRefs(array $refs): void
    {
        $checks = [
            'accountId' => fn ($id) => Account::find($id),
            'contactId' => fn ($id) => Contact::find($id),
            'dealId' => fn ($id) => Deal::find($id),
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
