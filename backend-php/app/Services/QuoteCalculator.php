<?php

namespace App\Services;

use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;

/**
 * Server-authoritative quote math — mirrors backend/src/services/quoteCalculator.ts
 * exactly (same model, same rounding). Uses brick/math's BigDecimal (pure-PHP
 * fallback when BCMath/GMP aren't available, like decimal.js is pure-JS) —
 * never native floats for money.
 *
 * Calculation model
 * -----------------
 *   per line:
 *     gross   = quantity * unitPrice
 *     lineDiscount = gross * (discountPct / 100)
 *     net     = gross - lineDiscount            (stored as lineTotal, pre-tax)
 *   netSubtotal  = Σ net
 *   overallDiscount = PERCENT: netSubtotal * value/100
 *                     AMOUNT : min(value, netSubtotal)
 *   factor   = (netSubtotal - overallDiscount) / netSubtotal   (0 if netSubtotal=0)
 *   per line: tax = net * factor * (taxPct / 100)              (overall discount
 *             spread proportionally so per-line tax stays correct)
 *
 * Stored quote totals (each rounded to 2 dp, kept mutually consistent):
 *   subtotal      = Σ gross                      (catalog value, pre-discount)
 *   discountTotal = Σ lineDiscount + overallDiscount
 *   taxTotal      = Σ tax
 *   grandTotal    = subtotal - discountTotal + taxTotal
 */
class QuoteCalculator
{
    private const DP = 2;

    /**
     * @param array<int, array{quantity: mixed, unitPrice: mixed, discountPct?: mixed, taxPct?: mixed}> $lines
     * @return array{lines: array<int, array{lineTotal: string}>, subtotal: string, discountTotal: string, taxTotal: string, grandTotal: string}
     */
    public static function calculate(array $lines, string $overallDiscountType = 'PERCENT', mixed $overallDiscountValue = 0): array
    {
        $subtotal = BigDecimal::zero();
        $lineDiscountTotal = BigDecimal::zero();
        $netSubtotal = BigDecimal::zero();

        $nets = [];
        $taxPcts = [];

        foreach ($lines as $line) {
            $gross = BigDecimal::of($line['quantity'])->multipliedBy(BigDecimal::of($line['unitPrice']));
            $discPct = BigDecimal::of($line['discountPct'] ?? 0);
            $lineDiscount = $gross->multipliedBy($discPct)->dividedBy(100, 10, RoundingMode::HALF_UP);
            $net = $gross->minus($lineDiscount);

            $subtotal = $subtotal->plus($gross);
            $lineDiscountTotal = $lineDiscountTotal->plus($lineDiscount);
            $netSubtotal = $netSubtotal->plus($net);
            $nets[] = $net;
            $taxPcts[] = BigDecimal::of($line['taxPct'] ?? 0);
        }

        // Overall discount, clamped so it can never exceed the net subtotal.
        if ($overallDiscountType === 'AMOUNT') {
            $overallDiscount = BigDecimal::of($overallDiscountValue);
            if ($overallDiscount->isGreaterThan($netSubtotal)) {
                $overallDiscount = $netSubtotal;
            }
        } else {
            $overallDiscount = $netSubtotal->multipliedBy(BigDecimal::of($overallDiscountValue))
                ->dividedBy(100, 10, RoundingMode::HALF_UP);
        }
        if ($overallDiscount->isNegative()) {
            $overallDiscount = BigDecimal::zero();
        }

        $factor = $netSubtotal->isGreaterThan(BigDecimal::zero())
            ? $netSubtotal->minus($overallDiscount)->dividedBy($netSubtotal, 20, RoundingMode::HALF_UP)
            : BigDecimal::zero();

        $taxTotal = BigDecimal::zero();
        $lineResults = [];
        foreach ($nets as $i => $net) {
            $taxable = $net->multipliedBy($factor);
            $tax = $taxable->multipliedBy($taxPcts[$i])->dividedBy(100, 10, RoundingMode::HALF_UP);
            $taxTotal = $taxTotal->plus($tax);
            $lineResults[] = ['lineTotal' => (string) $net->toScale(self::DP, RoundingMode::HALF_UP)];
        }

        $subtotalR = $subtotal->toScale(self::DP, RoundingMode::HALF_UP);
        $discountTotalR = $lineDiscountTotal->plus($overallDiscount)->toScale(self::DP, RoundingMode::HALF_UP);
        $taxTotalR = $taxTotal->toScale(self::DP, RoundingMode::HALF_UP);
        $grandTotalR = $subtotalR->minus($discountTotalR)->plus($taxTotalR);

        return [
            'lines' => $lineResults,
            'subtotal' => (string) $subtotalR,
            'discountTotal' => (string) $discountTotalR,
            'taxTotal' => (string) $taxTotalR,
            'grandTotal' => (string) $grandTotalR,
        ];
    }
}
