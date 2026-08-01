<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\User;
use App\Support\ApiResponse;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Illuminate\Http\JsonResponse;

/**
 * Aggregate dashboard metrics for the tenant — mirrors dashboard.controller.ts.
 * Monetary sums assume a single working currency (the tenant default); mixed-
 * currency tenants would need per-currency breakdowns or conversion via
 * ExchangeRate (future work). Quote/Invoice/User queries rely on
 * BelongsToTenant's auto-scoping (tenant.scope middleware already ran).
 */
class DashboardController extends Controller
{
    private const OPEN_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT'];

    public function summary(): JsonResponse
    {
        $now = now();
        $in7Days = $now->copy()->addDays(7);

        $byStatus = Quote::query()->selectRaw('status, count(*) as cnt, sum(grand_total) as total')->groupBy('status')->get();
        $byOwner = Quote::query()->selectRaw('owner_id, count(*) as cnt, sum(grand_total) as total')->groupBy('owner_id')->get();
        $acceptedByOwner = Quote::query()->where('status', 'ACCEPTED')
            ->selectRaw('owner_id, count(*) as cnt')->groupBy('owner_id')->get();
        $invByStatus = Invoice::query()->selectRaw('status, count(*) as cnt, sum(grand_total) as total')->groupBy('status')->get();
        $expiringSoon = Quote::query()->whereIn('status', self::OPEN_STATUSES)
            ->whereBetween('valid_until', [$now, $in7Days])->count();
        $owners = User::all(['id', 'name']);

        $counts = [];
        $valueByStatus = [];
        $totalQuotes = 0;
        foreach ($byStatus as $row) {
            $counts[$row->status] = (int) $row->cnt;
            $valueByStatus[$row->status] = BigDecimal::of((string) ($row->total ?? '0'));
            $totalQuotes += (int) $row->cnt;
        }
        $valOf = fn (string $s) => $valueByStatus[$s] ?? BigDecimal::zero();
        $cntOf = fn (string $s) => $counts[$s] ?? 0;

        $pipelineValue = BigDecimal::zero();
        foreach (self::OPEN_STATUSES as $s) {
            $pipelineValue = $pipelineValue->plus($valOf($s));
        }
        $acceptedValue = $valOf('ACCEPTED');

        $won = $cntOf('ACCEPTED');
        $lost = $cntOf('DECLINED') + $cntOf('EXPIRED');
        $decided = $won + $lost;
        $winRate = $decided === 0 ? 0 : round(($won / $decided) * 1000) / 10;

        $ownerName = $owners->pluck('name', 'id');
        $acceptedMap = [];
        foreach ($acceptedByOwner as $row) {
            $acceptedMap[$row->owner_id ?? 'none'] = (int) $row->cnt;
        }

        $perRep = $byOwner->map(fn ($row) => [
            'ownerId' => $row->owner_id,
            'name' => $row->owner_id ? ($ownerName[$row->owner_id] ?? 'Unknown') : 'Unassigned',
            'totalQuotes' => (int) $row->cnt,
            'acceptedQuotes' => $acceptedMap[$row->owner_id ?? 'none'] ?? 0,
            'totalValue' => (string) ($row->total ?? '0'),
        ])->sortByDesc('totalQuotes')->values();

        $invoiceCounts = [];
        $invoicedValue = BigDecimal::zero();
        foreach ($invByStatus as $row) {
            $invoiceCounts[$row->status] = (int) $row->cnt;
            // DRAFT invoices aren't actually invoiced yet, so they're excluded.
            if ($row->status !== 'DRAFT') {
                $invoicedValue = $invoicedValue->plus(BigDecimal::of((string) ($row->total ?? '0')));
            }
        }

        return ApiResponse::data([
            'quotes' => [
                'total' => $totalQuotes,
                'open' => array_sum(array_map($cntOf, self::OPEN_STATUSES)),
                // Cast so an empty tenant still serializes byStatus as {} not
                // [] — PHP can't otherwise distinguish an empty map from an
                // empty list once the array has zero entries.
                'byStatus' => (object) $counts,
            ],
            'pipelineValue' => (string) $pipelineValue->toScale(2, RoundingMode::HALF_UP),
            'acceptedValue' => (string) $acceptedValue->toScale(2, RoundingMode::HALF_UP),
            'winRate' => $winRate,
            'expiringSoon' => $expiringSoon,
            'invoicedValue' => (string) $invoicedValue->toScale(2, RoundingMode::HALF_UP),
            'invoices' => [
                'total' => array_sum($invoiceCounts),
                'outstanding' => ($invoiceCounts['PENDING'] ?? 0) + ($invoiceCounts['OVERDUE'] ?? 0),
                'paid' => $invoiceCounts['PAID'] ?? 0,
                'byStatus' => (object) $invoiceCounts,
            ],
            'perRep' => $perRep,
        ]);
    }
}
