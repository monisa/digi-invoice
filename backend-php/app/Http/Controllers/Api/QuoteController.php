<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\Quote\CreateQuoteRequest;
use App\Http\Requests\Quote\ListQuotesRequest;
use App\Http\Requests\Quote\UpdateQuoteRequest;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Deal;
use App\Models\Product;
use App\Models\Quote;
use App\Models\QuoteLineItem;
use App\Models\TaxRate;
use App\Models\User;
use App\Services\QuoteCalculator;
use App\Services\QuoteNumberService;
use App\Support\ApiResponse;
use App\Support\AuthContext;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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

    private function quoteWithFullDetail()
    {
        return Quote::with([
            'lineItems',
            'account',
            'contact',
            'owner:id,name,email,role',
            'activityLog',
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
            'ownerId' => fn ($id) => User::find($id),
            // templateId existence check lands in slice 5 once QuoteTemplate exists.
        ];
        foreach ($checks as $field => $lookup) {
            if (! empty($refs[$field]) && ! $lookup($refs[$field])) {
                throw ApiException::badRequest("{$field} does not exist", $field);
            }
        }
    }
}
