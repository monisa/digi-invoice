<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Concerns\ValidatesUuidParam;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\CreateUserRequest;
use App\Http\Requests\User\ListUsersRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\RefreshToken;
use App\Models\User;
use App\Services\PasswordService;
use App\Support\ApiResponse;
use App\Support\AuthContext;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    use ValidatesUuidParam;

    /** Public projection — NEVER return password_hash. */
    private const USER_FIELDS = ['id', 'name', 'email', 'role', 'status', 'lastLoginAt', 'createdAt', 'updatedAt'];

    public function __construct(
        private readonly AuthContext $auth,
        private readonly PasswordService $password,
    ) {}

    public function index(ListUsersRequest $request): JsonResponse
    {
        $input = $request->validated();
        $page = $input['page'] ?? 1;
        $pageSize = $input['pageSize'] ?? 20;

        $query = User::query();
        if (! empty($input['role'])) {
            $query->where('role', $input['role']);
        }
        if (! empty($input['status'])) {
            $query->where('status', $input['status']);
        }
        if (! empty($input['search'])) {
            $search = $input['search'];
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
        }

        $total = (clone $query)->count();
        $items = $query->orderByDesc('created_at')->forPage($page, $pageSize)->get()
            ->map(fn (User $u) => $this->publicUser($u));

        return ApiResponse::data($items, 200, Pagination::meta($total, $page, $pageSize));
    }

    public function show(string $id): JsonResponse
    {
        $this->validateUuidParam($id);

        $user = User::find($id);
        if (! $user) {
            throw ApiException::notFound('User not found');
        }

        return ApiResponse::data($this->publicUser($user));
    }

    public function store(CreateUserRequest $request): JsonResponse
    {
        $input = $request->validated();

        $user = User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password_hash' => $this->password->hash($input['password']),
            'role' => $input['role'] ?? 'SALES_REP',
            'status' => 'ACTIVE',
        ]);

        return ApiResponse::data($this->publicUser($user), 201);
    }

    public function update(string $id, UpdateUserRequest $request): JsonResponse
    {
        $this->validateUuidParam($id);

        $user = User::find($id);
        if (! $user) {
            throw ApiException::notFound('User not found');
        }

        $input = $request->validated();

        // Prevent self-lockout: an admin can't change their own role/status.
        if ($user->id === $this->auth->userId && (array_key_exists('role', $input) || array_key_exists('status', $input))) {
            throw ApiException::forbidden('You cannot change your own role or status');
        }

        if (array_key_exists('name', $input)) {
            $user->name = $input['name'];
        }
        if (array_key_exists('role', $input)) {
            $user->role = $input['role'];
        }
        if (array_key_exists('status', $input)) {
            $user->status = $input['status'];
        }
        if (array_key_exists('password', $input)) {
            $user->password_hash = $this->password->hash($input['password']);
        }
        $user->save();

        return ApiResponse::data($this->publicUser($user));
    }

    public function destroy(string $id): JsonResponse
    {
        if ($id === $this->auth->userId) {
            throw ApiException::forbidden('You cannot deactivate your own account');
        }
        $this->validateUuidParam($id);

        $user = User::find($id);
        if (! $user) {
            throw ApiException::notFound('User not found');
        }

        // Soft delete + suspend, and revoke their refresh tokens.
        DB::transaction(function () use ($user) {
            $user->status = 'SUSPENDED';
            $user->save();
            $user->delete();
            RefreshToken::where('user_id', $user->id)->where('revoked', false)->update(['revoked' => true]);
        });

        return ApiResponse::data(['success' => true]);
    }

    private function publicUser(User $user): array
    {
        return Arr::only($user->toArray(), self::USER_FIELDS);
    }
}
