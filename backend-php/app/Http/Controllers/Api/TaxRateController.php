<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\TaxRate\CreateTaxRateRequest;
use App\Http\Requests\TaxRate\ListTaxRatesRequest;
use App\Http\Requests\TaxRate\UpdateTaxRateRequest;
use App\Models\TaxRate;
use App\Support\ApiResponse;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;

class TaxRateController extends Controller
{
    use ValidatesUuidParam;

    public function index(ListTaxRatesRequest $request): JsonResponse
    {
        $input = $request->validated();
        $page = $input['page'] ?? 1;
        $pageSize = $input['pageSize'] ?? 20;

        $query = TaxRate::query();
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

        $taxRate = TaxRate::find($id);
        if (! $taxRate) {
            throw ApiException::notFound('Tax rate not found');
        }

        return ApiResponse::data($taxRate);
    }

    public function store(CreateTaxRateRequest $request): JsonResponse
    {
        $input = $request->validated();

        $taxRate = TaxRate::create([
            'name' => $input['name'],
            'percentage' => $input['percentage'],
        ]);

        return ApiResponse::data($taxRate, 201);
    }

    public function update(string $id, UpdateTaxRateRequest $request): JsonResponse
    {
        $this->validateUuidParam($id);

        $taxRate = TaxRate::find($id);
        if (! $taxRate) {
            throw ApiException::notFound('Tax rate not found');
        }

        $input = $request->validated();
        foreach (['name', 'percentage'] as $key) {
            if (array_key_exists($key, $input)) {
                $taxRate->{$key} = $input[$key];
            }
        }
        $taxRate->save();

        return ApiResponse::data($taxRate);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $taxRate = TaxRate::find($id);
        if (! $taxRate) {
            throw ApiException::notFound('Tax rate not found');
        }

        $taxRate->delete();

        return ApiResponse::data(['success' => true]);
    }
}
