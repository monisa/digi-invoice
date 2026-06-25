import Decimal from 'decimal.js';
import type { DiscountType } from '../../core/models/quote.model';

/**
 * Client-side mirror of the backend quoteCalculator (same model + rounding).
 * Used only for the live preview in the builder — the server remains
 * authoritative and recomputes on save.
 */
const DP = 2;
const round = (d: Decimal): Decimal => d.toDecimalPlaces(DP, Decimal.ROUND_HALF_UP);

export interface CalcLine {
  quantity: Decimal.Value;
  unitPrice: Decimal.Value;
  discountPct?: Decimal.Value;
  taxPct?: Decimal.Value;
}

export interface CalcTotals {
  lineTotals: string[];
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
}

export function calculateQuote(
  lines: CalcLine[],
  overallDiscountType: DiscountType = 'PERCENT',
  overallDiscountValue: Decimal.Value = 0,
): CalcTotals {
  let subtotal = new Decimal(0);
  let lineDiscountTotal = new Decimal(0);
  let netSubtotal = new Decimal(0);
  const nets: Decimal[] = [];
  const taxPcts: Decimal[] = [];

  for (const line of lines) {
    const gross = new Decimal(line.quantity || 0).times(line.unitPrice || 0);
    const discPct = new Decimal(line.discountPct || 0);
    const lineDiscount = gross.times(discPct).dividedBy(100);
    const net = gross.minus(lineDiscount);
    subtotal = subtotal.plus(gross);
    lineDiscountTotal = lineDiscountTotal.plus(lineDiscount);
    netSubtotal = netSubtotal.plus(net);
    nets.push(net);
    taxPcts.push(new Decimal(line.taxPct || 0));
  }

  let overallDiscount =
    overallDiscountType === 'AMOUNT'
      ? Decimal.min(new Decimal(overallDiscountValue || 0), netSubtotal)
      : netSubtotal.times(new Decimal(overallDiscountValue || 0)).dividedBy(100);
  if (overallDiscount.lessThan(0)) overallDiscount = new Decimal(0);

  const factor = netSubtotal.greaterThan(0)
    ? netSubtotal.minus(overallDiscount).dividedBy(netSubtotal)
    : new Decimal(0);

  let taxTotal = new Decimal(0);
  const lineTotals = nets.map((net, i) => {
    taxTotal = taxTotal.plus(net.times(factor).times(taxPcts[i]).dividedBy(100));
    return round(net).toFixed(DP);
  });

  const subtotalR = round(subtotal);
  const discountTotalR = round(lineDiscountTotal.plus(overallDiscount));
  const taxTotalR = round(taxTotal);
  const grandTotalR = subtotalR.minus(discountTotalR).plus(taxTotalR);

  return {
    lineTotals,
    subtotal: subtotalR.toFixed(DP),
    discountTotal: discountTotalR.toFixed(DP),
    taxTotal: taxTotalR.toFixed(DP),
    grandTotal: grandTotalR.toFixed(DP),
  };
}
