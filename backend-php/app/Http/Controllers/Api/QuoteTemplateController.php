<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\QuoteTemplate\CreateQuoteTemplateRequest;
use App\Http\Requests\QuoteTemplate\ListQuoteTemplatesRequest;
use App\Http\Requests\QuoteTemplate\UpdateQuoteTemplateRequest;
use App\Models\QuoteTemplate;
use App\Support\ApiResponse;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class QuoteTemplateController extends Controller
{
    use ValidatesUuidParam;

    public function index(ListQuoteTemplatesRequest $request): JsonResponse
    {
        $input = $request->validated();
        $page = $input['page'] ?? 1;
        $pageSize = $input['pageSize'] ?? 20;

        $query = QuoteTemplate::query();
        if (! empty($input['search'])) {
            $query->where('name', 'like', '%'.$input['search'].'%');
        }

        $total = (clone $query)->count();
        $items = $query->orderByDesc('is_default')->orderByDesc('created_at')->forPage($page, $pageSize)->get();

        return ApiResponse::data($items, 200, Pagination::meta($total, $page, $pageSize));
    }

    public function show(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $template = QuoteTemplate::find($id);
        if (! $template) {
            throw ApiException::notFound('Template not found');
        }

        return ApiResponse::data($template);
    }

    public function store(CreateQuoteTemplateRequest $request): JsonResponse
    {
        $input = $request->validated();

        // First template becomes the default automatically.
        $isDefault = $input['isDefault'] ?? (QuoteTemplate::count() === 0);

        $template = DB::transaction(function () use ($input, $isDefault) {
            if ($isDefault) {
                QuoteTemplate::where('is_default', true)->update(['is_default' => false]);
            }

            return QuoteTemplate::create([
                'name' => $input['name'],
                'header_html' => $input['headerHtml'] ?? null,
                'footer_html' => $input['footerHtml'] ?? null,
                'terms_html' => $input['termsHtml'] ?? null,
                'is_default' => $isDefault,
            ]);
        });

        return ApiResponse::data($template, 201);
    }

    public function update(string $id, UpdateQuoteTemplateRequest $request): JsonResponse
    {
        $this->validateUuidParam($id);

        $template = QuoteTemplate::find($id);
        if (! $template) {
            throw ApiException::notFound('Template not found');
        }

        $input = $request->validated();

        DB::transaction(function () use ($template, $input) {
            if (($input['isDefault'] ?? false) === true) {
                QuoteTemplate::where('is_default', true)->where('id', '!=', $template->id)->update(['is_default' => false]);
            }

            $map = [
                'name' => 'name',
                'headerHtml' => 'header_html',
                'footerHtml' => 'footer_html',
                'termsHtml' => 'terms_html',
                'isDefault' => 'is_default',
            ];
            foreach ($map as $key => $column) {
                if (array_key_exists($key, $input)) {
                    $template->{$column} = $input[$key];
                }
            }
            $template->save();
        });

        return ApiResponse::data($template->fresh());
    }

    public function destroy(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $template = QuoteTemplate::find($id);
        if (! $template) {
            throw ApiException::notFound('Template not found');
        }

        $template->is_default = false;
        $template->save();
        $template->delete();

        return ApiResponse::data(['success' => true]);
    }
}
