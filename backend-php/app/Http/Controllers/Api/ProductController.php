<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\Product\CreateProductRequest;
use App\Http\Requests\Product\ListProductsRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Product;
use App\Models\TaxRate;
use App\Support\ApiResponse;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    use ValidatesUuidParam;

    public function index(ListProductsRequest $request): JsonResponse
    {
        $input = $request->validated();
        $page = $input['page'] ?? 1;
        $pageSize = $input['pageSize'] ?? 20;

        $query = Product::query()->with(['taxRate:id,name,percentage']);
        if (! empty($input['taxRateId'])) {
            $query->where('tax_rate_id', $input['taxRateId']);
        }
        if (! empty($input['search'])) {
            $search = $input['search'];
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%"));
        }

        $total = (clone $query)->count();
        $items = $query->orderByDesc('created_at')->forPage($page, $pageSize)->get();

        return ApiResponse::data($items, 200, Pagination::meta($total, $page, $pageSize));
    }

    public function show(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $product = Product::with('taxRate')->find($id);
        if (! $product) {
            throw ApiException::notFound('Product not found');
        }

        return ApiResponse::data($product);
    }

    public function store(CreateProductRequest $request): JsonResponse
    {
        $input = $request->validated();

        if (! empty($input['taxRateId'])) {
            $this->assertTaxRateExists($input['taxRateId']);
        }

        $product = Product::create([
            'name' => $input['name'],
            'sku' => $input['sku'] ?? null,
            'unit_price' => $input['unitPrice'],
            'currency' => $input['currency'] ?? 'USD',
            'tax_rate_id' => $input['taxRateId'] ?? null,
            'description' => $input['description'] ?? null,
        ]);

        return ApiResponse::data($product, 201);
    }

    public function update(string $id, UpdateProductRequest $request): JsonResponse
    {
        $this->validateUuidParam($id);

        $product = Product::find($id);
        if (! $product) {
            throw ApiException::notFound('Product not found');
        }

        $input = $request->validated();
        if (! empty($input['taxRateId'])) {
            $this->assertTaxRateExists($input['taxRateId']);
        }

        $map = [
            'name' => 'name',
            'sku' => 'sku',
            'unitPrice' => 'unit_price',
            'currency' => 'currency',
            'taxRateId' => 'tax_rate_id',
            'description' => 'description',
        ];
        foreach ($map as $key => $column) {
            if (array_key_exists($key, $input)) {
                $product->{$column} = $input[$key];
            }
        }
        $product->save();

        return ApiResponse::data($product);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $product = Product::find($id);
        if (! $product) {
            throw ApiException::notFound('Product not found');
        }

        $product->delete();

        return ApiResponse::data(['success' => true]);
    }

    private function assertTaxRateExists(string $taxRateId): void
    {
        if (! TaxRate::find($taxRateId)) {
            throw ApiException::badRequest('taxRateId does not exist', 'taxRateId');
        }
    }
}
