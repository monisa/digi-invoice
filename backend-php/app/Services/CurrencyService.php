<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\ExchangeRate;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Currency / FX helpers. syncFromApi() pulls live rates from a free public
 * provider (open.er-api.com) and upserts a curated set of common currencies
 * for today — mirrors currency.service.ts. Exposed via an endpoint so a VPS
 * cron can call it later; not auto-scheduled on Hostinger shared hosting
 * (unreliable background jobs).
 */
class CurrencyService
{
    private const COMMON_CURRENCIES = [
        'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY', 'SGD', 'AED',
        'CHF', 'NZD', 'ZAR', 'SEK', 'HKD', 'BRL', 'MXN',
    ];

    public static function syncFromApi(string $tenantId, string $base): int
    {
        try {
            $response = Http::timeout(10)->get("https://open.er-api.com/v6/latest/{$base}");
        } catch (Throwable) {
            throw new ApiException(502, 'FX_PROVIDER_UNAVAILABLE', 'Could not reach the exchange-rate provider');
        }

        $json = $response->json();
        if (($json['result'] ?? null) !== 'success' || empty($json['rates'])) {
            throw new ApiException(502, 'FX_PROVIDER_ERROR', 'The exchange-rate provider returned an error');
        }

        $effectiveDate = now('UTC')->startOfDay();
        $count = 0;

        foreach (self::COMMON_CURRENCIES as $target) {
            $rate = $json['rates'][$target] ?? null;
            if ($target === $base || $rate === null) {
                continue;
            }

            ExchangeRate::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'base_currency' => $base,
                    'target_currency' => $target,
                    'effective_date' => $effectiveDate,
                ],
                ['rate' => (string) $rate],
            );
            $count++;
        }

        return $count;
    }
}
