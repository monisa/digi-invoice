<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\LogoutRequest;
use App\Http\Requests\Auth\RefreshRequest;
use App\Http\Requests\Auth\SignupRequest;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function signup(SignupRequest $request): JsonResponse
    {
        $result = $this->auth->signup($request->validated());

        return ApiResponse::data($result, 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->auth->login($request->validated());

        return ApiResponse::data($result, 200);
    }

    public function refresh(RefreshRequest $request): JsonResponse
    {
        $tokens = $this->auth->refresh($request->validated()['refreshToken']);

        return ApiResponse::data($tokens, 200);
    }

    public function logout(LogoutRequest $request): JsonResponse
    {
        $this->auth->logout($request->validated()['refreshToken']);

        return ApiResponse::data(['success' => true], 200);
    }
}
