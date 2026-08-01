<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\CreateAccountRequest;
use App\Http\Requests\Account\ListAccountsRequest;
use App\Http\Requests\Account\UpdateAccountRequest;
use App\Models\Account;
use App\Support\ApiResponse;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;

class AccountController extends Controller
{
    use ValidatesUuidParam;

    public function index(ListAccountsRequest $request): JsonResponse
    {
        $input = $request->validated();
        $page = $input['page'] ?? 1;
        $pageSize = $input['pageSize'] ?? 20;

        $query = Account::query();
        if (! empty($input['search'])) {
            $query->where('name', 'like', '%'.$input['search'].'%');
        }

        $total = (clone $query)->count();
        $items = $query->orderByDesc('created_at')
            ->forPage($page, $pageSize)
            ->get();

        return ApiResponse::data($items, 200, Pagination::meta($total, $page, $pageSize));
    }

    public function show(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $account = Account::with(['contacts'])->find($id);
        if (! $account) {
            throw ApiException::notFound('Account not found');
        }

        return ApiResponse::data($account);
    }

    public function store(CreateAccountRequest $request): JsonResponse
    {
        $input = $request->validated();

        $account = Account::create([
            'name' => $input['name'],
            'industry' => $input['industry'] ?? null,
            'website' => $input['website'] ?? null,
            'billing_address' => $input['billingAddress'] ?? null,
            'shipping_address' => $input['shippingAddress'] ?? null,
        ]);

        return ApiResponse::data($account, 201);
    }

    public function update(string $id, UpdateAccountRequest $request): JsonResponse
    {
        $this->validateUuidParam($id);

        $account = Account::find($id);
        if (! $account) {
            throw ApiException::notFound('Account not found');
        }

        $input = $request->validated();
        $map = [
            'name' => 'name',
            'industry' => 'industry',
            'website' => 'website',
            'billingAddress' => 'billing_address',
            'shippingAddress' => 'shipping_address',
        ];
        foreach ($map as $key => $column) {
            if (array_key_exists($key, $input)) {
                $account->{$column} = $input[$key];
            }
        }
        $account->save();

        return ApiResponse::data($account);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $account = Account::find($id);
        if (! $account) {
            throw ApiException::notFound('Account not found');
        }

        $account->delete();

        return ApiResponse::data(['success' => true]);
    }
}
