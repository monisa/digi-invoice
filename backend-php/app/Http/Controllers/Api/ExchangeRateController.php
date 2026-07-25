<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\ExchangeRate\CreateExchangeRateRequest;
use App\Http\Requests\ExchangeRate\LatestRateRequest;
use App\Http\Requests\ExchangeRate\ListExchangeRatesRequest;
use App\Http\Requests\ExchangeRate\UpdateExchangeRateRequest;
use App\Models\ExchangeRate;
use App\Models\Tenant;
use App\Services\CurrencyService;
use App\Support\ApiResponse;
use App\Support\AuthContext;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;

class ExchangeRateController extends Controller
{
    use ValidatesUuidParam;

    public function __construct(private readonly AuthContext $auth) {}

    public function index(ListExchangeRatesRequest $request): JsonResponse
    {
        $input = $request->validated();
        $page = $input['page'] ?? 1;
        $pageSize = $input['pageSize'] ?? 20;

        $query = ExchangeRate::query();
        if (! empty($input['baseCurrency'])) {
            $query->where('base_currency', $input['baseCurrency']);
        }
        if (! empty($input['targetCurrency'])) {
            $query->where('target_currency', $input['targetCurrency']);
        }

        $total = (clone $query)->count();
        $items = $query->orderByDesc('effective_date')->forPage($page, $pageSize)->get();

        return ApiResponse::data($items, 200, Pagination::meta($total, $page, $pageSize));
    }

    /** Most recent rate for a base->target pair. */
    public function latest(LatestRateRequest $request): JsonResponse
    {
        $input = $request->validated();
        $base = $input['base'];
        $target = $input['target'];

        if ($base === $target) {
            return ApiResponse::data([
                'baseCurrency' => $base, 'targetCurrency' => $target, 'rate' => '1', 'effectiveDate' => null,
            ]);
        }

        $rate = ExchangeRate::where('base_currency', $base)->where('target_currency', $target)
            ->orderByDesc('effective_date')->first();
        if (! $rate) {
            throw ApiException::notFound('No exchange rate found for that currency pair');
        }

        return ApiResponse::data($rate);
    }

    public function store(CreateExchangeRateRequest $request): JsonResponse
    {
        $input = $request->validated();

        $rate = ExchangeRate::create([
            'base_currency' => $input['baseCurrency'],
            'target_currency' => $input['targetCurrency'],
            'rate' => $input['rate'],
            'effective_date' => $input['effectiveDate'],
        ]);

        return ApiResponse::data($rate, 201);
    }

    public function update(string $id, UpdateExchangeRateRequest $request): JsonResponse
    {
        $this->validateUuidParam($id);

        $rate = ExchangeRate::find($id);
        if (! $rate) {
            throw ApiException::notFound('Exchange rate not found');
        }

        $input = $request->validated();
        if (array_key_exists('rate', $input)) {
            $rate->rate = $input['rate'];
        }
        if (array_key_exists('effectiveDate', $input)) {
            $rate->effective_date = $input['effectiveDate'];
        }
        $rate->save();

        return ApiResponse::data($rate);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $rate = ExchangeRate::find($id);
        if (! $rate) {
            throw ApiException::notFound('Exchange rate not found');
        }

        $rate->delete();

        return ApiResponse::data(['success' => true]);
    }

    /** Pull live rates from the FX provider for the tenant's base currency. */
    public function sync(): JsonResponse
    {
        $tenant = Tenant::find($this->auth->tenantId);
        $base = $tenant->currency_default ?? 'USD';

        $count = CurrencyService::syncFromApi($this->auth->tenantId, $base);

        return ApiResponse::data(['baseCurrency' => $base, 'updated' => $count]);
    }
}
