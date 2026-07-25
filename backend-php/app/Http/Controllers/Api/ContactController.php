<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\Contact\CreateContactRequest;
use App\Http\Requests\Contact\ListContactsRequest;
use App\Http\Requests\Contact\UpdateContactRequest;
use App\Models\Account;
use App\Models\Contact;
use App\Support\ApiResponse;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;

class ContactController extends Controller
{
    use ValidatesUuidParam;

    public function index(ListContactsRequest $request): JsonResponse
    {
        $input = $request->validated();
        $page = $input['page'] ?? 1;
        $pageSize = $input['pageSize'] ?? 20;

        $query = Contact::query()->with(['account:id,name']);
        if (! empty($input['accountId'])) {
            $query->where('account_id', $input['accountId']);
        }
        if (! empty($input['search'])) {
            $search = $input['search'];
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
        }

        $total = (clone $query)->count();
        $items = $query->orderByDesc('created_at')->forPage($page, $pageSize)->get();

        return ApiResponse::data($items, 200, Pagination::meta($total, $page, $pageSize));
    }

    public function show(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $contact = Contact::with('account')->find($id);
        if (! $contact) {
            throw ApiException::notFound('Contact not found');
        }

        return ApiResponse::data($contact);
    }

    public function store(CreateContactRequest $request): JsonResponse
    {
        $input = $request->validated();

        if (! empty($input['accountId'])) {
            $this->assertAccountExists($input['accountId']);
        }

        $contact = Contact::create([
            'name' => $input['name'],
            'account_id' => $input['accountId'] ?? null,
            'email' => $input['email'] ?? null,
            'phone' => $input['phone'] ?? null,
        ]);

        return ApiResponse::data($contact, 201);
    }

    public function update(string $id, UpdateContactRequest $request): JsonResponse
    {
        $this->validateUuidParam($id);

        $contact = Contact::find($id);
        if (! $contact) {
            throw ApiException::notFound('Contact not found');
        }

        $input = $request->validated();
        if (! empty($input['accountId'])) {
            $this->assertAccountExists($input['accountId']);
        }

        $map = ['name' => 'name', 'accountId' => 'account_id', 'email' => 'email', 'phone' => 'phone'];
        foreach ($map as $key => $column) {
            if (array_key_exists($key, $input)) {
                $contact->{$column} = $input[$key];
            }
        }
        $contact->save();

        return ApiResponse::data($contact);
    }

    public function destroy(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $contact = Contact::find($id);
        if (! $contact) {
            throw ApiException::notFound('Contact not found');
        }

        $contact->delete();

        return ApiResponse::data(['success' => true]);
    }

    private function assertAccountExists(string $accountId): void
    {
        if (! Account::find($accountId)) {
            throw ApiException::badRequest('accountId does not exist', 'accountId');
        }
    }
}
