<?php

namespace App\Support;

/** Spells out a decimal amount for the PDF's "Total in words" line, e.g. "Twenty-Seven Thousand Five Hundred". */
class NumberToWords
{
    private const ONES = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
    ];

    private const TENS = [
        '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
    ];

    private const SCALES = ['', 'Thousand', 'Million', 'Billion'];

    /** @param string $amount decimal string, e.g. "27500.00" */
    public static function amountToWords(string $amount, string $currencyName, string $subunitName = 'Cents'): string
    {
        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '00');
        $wholeWords = self::convert((int) $whole);
        $words = $currencyName.' '.($wholeWords ?: 'Zero');

        $cents = (int) round(((int) str_pad(substr($fraction, 0, 2), 2, '0')) );
        if ($cents > 0) {
            $words .= ' and '.self::convert($cents).' '.$subunitName;
        }

        return $words.' Only';
    }

    public static function convert(int $number): string
    {
        if ($number === 0) {
            return '';
        }
        if ($number < 0) {
            return 'Minus '.self::convert(-$number);
        }

        $groups = [];
        while ($number > 0) {
            $groups[] = $number % 1000;
            $number = intdiv($number, 1000);
        }

        $parts = [];
        foreach (array_reverse($groups, true) as $i => $group) {
            if ($group === 0) {
                continue;
            }
            $groupWords = self::convertUnderThousand($group);
            $scale = self::SCALES[$i] ?? '';
            $parts[] = trim($groupWords.' '.$scale);
        }

        return implode(' ', $parts);
    }

    private static function convertUnderThousand(int $n): string
    {
        $parts = [];
        if ($n >= 100) {
            $parts[] = self::ONES[intdiv($n, 100)].' Hundred';
            $n %= 100;
        }
        if ($n >= 20) {
            $tens = self::TENS[intdiv($n, 10)];
            $ones = $n % 10;
            $parts[] = $ones > 0 ? $tens.'-'.self::ONES[$ones] : $tens;
        } elseif ($n > 0) {
            $parts[] = self::ONES[$n];
        }

        return implode(' ', $parts);
    }
}
