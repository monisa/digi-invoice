<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\Deal\CreateDealRequest;
use App\Http\Requests\Deal\ListDealsRequest;
use App\Http\Requests\Deal\UpdateDealRequest;
use App\Models\Account;
use App\Models\Deal;
use App\Support\ApiResponse;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;

class DealController extends Controller
{
    use ValidatesUuidParam;

    public function index(ListDealsRequest $request): JsonResponse
    {
        $input = $request->validated();
        $page = $input['page'] ?? 1;
        $pageSize = $input['pageSize'] ?? 20;

        $query = Deal::query()->with(['account:id,name']);
        if (! empty($input['accountId'])) {
            $query->where('account_id', $input['accountId']);
        }
        if (! empty($input['stage'])) {
            $query->where('stage', $input['stage']);
        }
        if (! empty($input['search'])) {
            $query->where('name', 'like', '%'.$input['search'].'%');
        }

        $total = (clone $query)->count();
        $items = $query->orderByDesc('created_at')->forPage($page, $pageSize)->get();

        return ApiResponse::data($items, 200, Pagination::meta($total, $page, $pageSize));
    }

    public function show(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $deal = Deal::with('account')->find($id);
        if (! $deal) {
            throw ApiException::notFound('Deal not found');
        }

        return ApiResponse::data($deal);
    }

    public function store(CreateDealRequest $request): JsonResponse
    {
        $input = $request->validated();

        if (! empty($input['accountId'])) {
            $this->assertAccountExists($input['accountId']);
        }

        $deal = Deal::create([
            'name' => $input['name'],
            'account_id' => $input['accountId'] ?? null,
            'stage' => $input['stage'] ?? 'PROSPECTING',
            'amount' => $input['amount'] ?? null,
            'currency' => $input['currency'] ?? 'USD',
            'expected_close_date' => $input['expectedCloseDate'] ?? null,
        ]);

        return ApiResponse::data($deal, 201);
    }

    public function update(string $id, UpdateDealRequest $request): JsonResponse
    {
        $this->validateUuidParam($id);

        $deal = Deal::find($id);
        if (! $deal) {
            throw ApiException::notFound('Deal not found');
        }

        $input = $request->validated();
        if (! empty($input['accountId'])) {
            $this->assertAccountExists($input['accountId']);
        }

        $map = [
            'name' => 'name',
            'accountId' => 'account_id',
            'stage' => 'stage',
            'amount' => 'amount',
            'currency' => 'currency',
            'expectedCloseDate' => 'expected_close_date',
        ];
        foreach ($map as $key => $column) {
            if (array_key_exists($key, $input)) {
                $deal->{$column} = $input[$key];
            }
        }
        $deal->save();

        return ApiResponse::data($deal);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $deal = Deal::find($id);
        if (! $deal) {
            throw ApiException::notFound('Deal not found');
        }

        $deal->delete();

        return ApiResponse::data(['success' => true]);
    }

    private function assertAccountExists(string $accountId): void
    {
        if (! Account::find($accountId)) {
            throw ApiException::badRequest('accountId does not exist', 'accountId');
        }
    }
}
