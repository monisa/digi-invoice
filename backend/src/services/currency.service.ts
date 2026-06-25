import type { TenantPrisma } from '../lib/tenantPrisma';
import { ApiError } from '../utils/apiResponse';

/**
 * Currency / FX helpers. `syncFromApi` pulls live rates from a free public
 * provider (open.er-api.com) and upserts a curated set of common currencies
 * for today. Exposed via an endpoint so a VPS cron can call it later; we do
 * NOT auto-schedule on Hostinger shared hosting (unreliable background jobs).
 */

const COMMON_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY', 'SGD', 'AED',
  'CHF', 'NZD', 'ZAR', 'SEK', 'HKD', 'BRL', 'MXN',
];

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export const CurrencyService = {
  async syncFromApi(db: TenantPrisma, tenantId: string, base: string): Promise<number> {
    let json: { result?: string; rates?: Record<string, number> };
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      json = (await res.json()) as typeof json;
    } catch {
      throw new ApiError(502, 'FX_PROVIDER_UNAVAILABLE', 'Could not reach the exchange-rate provider');
    }
    if (json.result !== 'success' || !json.rates) {
      throw new ApiError(502, 'FX_PROVIDER_ERROR', 'The exchange-rate provider returned an error');
    }

    const effectiveDate = todayUtc();
    let count = 0;
    for (const target of COMMON_CURRENCIES) {
      const rate = json.rates[target];
      if (target === base || rate === undefined) continue;
      await db.exchangeRate.upsert({
        where: {
          tenantId_baseCurrency_targetCurrency_effectiveDate: {
            tenantId,
            baseCurrency: base,
            targetCurrency: target,
            effectiveDate,
          },
        },
        create: { tenantId, baseCurrency: base, targetCurrency: target, rate: String(rate), effectiveDate },
        update: { rate: String(rate) },
      });
      count++;
    }
    return count;
  },
};
