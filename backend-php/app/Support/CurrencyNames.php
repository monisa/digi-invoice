<?php

namespace App\Support;

/** ISO 4217 code -> spelled-out name, for the PDF's "Total in words" line. Falls back to the raw code. */
class CurrencyNames
{
    private const NAMES = [
        'USD' => 'US Dollar',
        'EUR' => 'Euro',
        'GBP' => 'British Pound',
        'INR' => 'Indian Rupee',
        'AUD' => 'Australian Dollar',
        'CAD' => 'Canadian Dollar',
        'AED' => 'UAE Dirham',
        'SGD' => 'Singapore Dollar',
        'JPY' => 'Japanese Yen',
        'CNY' => 'Chinese Yuan',
    ];

    public static function nameFor(string $code): string
    {
        return self::NAMES[strtoupper($code)] ?? strtoupper($code);
    }
}
