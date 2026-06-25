import Decimal from 'decimal.js';
import type { DiscountType } from '@prisma/client';

/**
 * Server-authoritative quote math. The client may mirror this for live UX, but
 * the values persisted to the DB ALWAYS come from here. All money uses
 * decimal.js (never native floats) and is rounded to 2 dp, half-up.
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

const DP = 2;
const ROUND = Decimal.ROUND_HALF_UP;
const round = (d: Decimal): Decimal => d.toDecimalPlaces(DP, ROUND);

export interface CalcLineInput {
  quantity: Decimal.Value;
  unitPrice: Decimal.Value;
  discountPct?: Decimal.Value;
  /** Resolved tax-rate percentage for this line (0 if none). */
  taxPct?: Decimal.Value;
}

export interface CalcLineResult {
  /** Net of line discount, before tax. Persisted as QuoteLineItem.lineTotal. */
  lineTotal: string;
}

export interface CalcResult {
  lines: CalcLineResult[];
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
}

export function calculateQuote(
  lines: CalcLineInput[],
  overallDiscountType: DiscountType = 'PERCENT',
  overallDiscountValue: Decimal.Value = 0,
): CalcResult {
  let subtotal = new Decimal(0); // Σ gross
  let lineDiscountTotal = new Decimal(0);
  let netSubtotal = new Decimal(0);

  const nets: Decimal[] = [];
  const taxPcts: Decimal[] = [];

  for (const line of lines) {
    const gross = new Decimal(line.quantity).times(line.unitPrice);
    const discPct = new Decimal(line.discountPct ?? 0);
    const lineDiscount = gross.times(discPct).dividedBy(100);
    const net = gross.minus(lineDiscount);

    subtotal = subtotal.plus(gross);
    lineDiscountTotal = lineDiscountTotal.plus(lineDiscount);
    netSubtotal = netSubtotal.plus(net);
    nets.push(net);
    taxPcts.push(new Decimal(line.taxPct ?? 0));
  }

  // Overall discount, clamped so it can never exceed the net subtotal.
  let overallDiscount: Decimal;
  if (overallDiscountType === 'AMOUNT') {
    overallDiscount = Decimal.min(new Decimal(overallDiscountValue), netSubtotal);
  } else {
    overallDiscount = netSubtotal.times(new Decimal(overallDiscountValue)).dividedBy(100);
  }
  if (overallDiscount.lessThan(0)) overallDiscount = new Decimal(0);

  const factor = netSubtotal.greaterThan(0)
    ? netSubtotal.minus(overallDiscount).dividedBy(netSubtotal)
    : new Decimal(0);

  let taxTotal = new Decimal(0);
  const lineResults: CalcLineResult[] = nets.map((net, i) => {
    const taxable = net.times(factor);
    const tax = taxable.times(taxPcts[i]).dividedBy(100);
    taxTotal = taxTotal.plus(tax);
    return { lineTotal: round(net).toFixed(DP) };
  });

  const subtotalR = round(subtotal);
  const discountTotalR = round(lineDiscountTotal.plus(overallDiscount));
  const taxTotalR = round(taxTotal);
  const grandTotalR = subtotalR.minus(discountTotalR).plus(taxTotalR);

  return {
    lines: lineResults,
    subtotal: subtotalR.toFixed(DP),
    discountTotal: discountTotalR.toFixed(DP),
    taxTotal: taxTotalR.toFixed(DP),
    grandTotal: grandTotalR.toFixed(DP),
  };
}
