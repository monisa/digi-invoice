<?php

namespace App\Exceptions;

use Exception;

/**
 * Application error carrying an HTTP status and an envelope-ready error list.
 * Throw these from controllers/services; bootstrap/app.php's exception
 * renderer turns them into the { data, meta, errors } envelope.
 */
class ApiException extends Exception
{
    /** @var array<int, array{code: string, message: string, field?: string}> */
    public readonly array $errors;

    public function __construct(public readonly int $status, string $code, string $message, ?string $field = null)
    {
        parent::__construct($message);

        $this->errors = [array_filter([
            'code' => $code,
            'message' => $message,
            'field' => $field,
        ], fn ($v) => $v !== null)];
    }

    public static function badRequest(string $message, ?string $field = null): self
    {
        return new self(400, 'BAD_REQUEST', $message, $field);
    }

    public static function unauthorized(string $message = 'Authentication required'): self
    {
        return new self(401, 'UNAUTHORIZED', $message);
    }

    public static function forbidden(string $message = 'Insufficient permissions'): self
    {
        return new self(403, 'FORBIDDEN', $message);
    }

    public static function notFound(string $message = 'Resource not found'): self
    {
        return new self(404, 'NOT_FOUND', $message);
    }

    public static function conflict(string $message): self
    {
        return new self(409, 'CONFLICT', $message);
    }
}
