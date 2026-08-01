<?php

namespace App\Services;

use App\Models\QuoteNumberSequence;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Atomic per-tenant sequential numbering, e.g. QT-2026-00001. One counter
 * row per (tenant, prefix, year) — mirrors the quoteNumberSequence upsert
 * pattern in quote.controller.ts's create(). Must be called from within an
 * existing DB transaction (caller owns the transaction boundary).
 *
 * insertOrIgnore makes the "first number of the year" race safe (a losing
 * concurrent insert just no-ops); the subsequent lockForUpdate() serializes
 * increments so no two callers can ever get the same number.
 */
class QuoteNumberService
{
    public static function next(string $tenantId, string $prefix): string
    {
        $year = (int) date('Y');

        DB::table('quote_number_sequences')->insertOrIgnore([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'prefix' => $prefix,
            'year' => $year,
            'last_value' => 0,
        ]);

        $seq = QuoteNumberSequence::where('tenant_id', $tenantId)
            ->where('prefix', $prefix)
            ->where('year', $year)
            ->lockForUpdate()
            ->firstOrFail();

        $seq->increment('last_value');

        return sprintf('%s-%d-%05d', $prefix, $year, $seq->last_value);
    }
}
