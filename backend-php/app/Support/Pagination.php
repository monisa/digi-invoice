<?php

namespace App\Support;

/** Mirrors backend/src/utils/pagination.ts's buildPageMeta(). */
class Pagination
{
    public static function meta(int $total, int $page, int $pageSize): array
    {
        return [
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
            'totalPages' => max(1, (int) ceil($total / $pageSize)),
        ];
    }
}
