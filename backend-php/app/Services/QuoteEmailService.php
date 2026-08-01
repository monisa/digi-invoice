<?php

namespace App\Services;

use App\Mail\QuoteMail;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Mirrors backend/src/services/email.service.ts: when SMTP isn't configured
 * (MAIL_MAILER=log, the .env.example default) this is a no-op that reports
 * sent:false, skipped:true, so "send quote" still succeeds in dev/unconfigured
 * environments. Configure real SMTP via hPanel env vars in production.
 */
class QuoteEmailService
{
    public static function isConfigured(): bool
    {
        // config('mail.mailers.smtp.host') always has a non-empty default
        // ('127.0.0.1') regardless of which mailer is active, so it can't be
        // used as the signal — check the *active* mailer instead. The
        // .env.example default (MAIL_MAILER=log) is intentionally "not
        // configured"; production sets MAIL_MAILER=smtp explicitly.
        return config('mail.default') === 'smtp' && filled(config('mail.mailers.smtp.host'));
    }

    /** @return array{sent: bool, skipped?: bool, error?: string} */
    public static function sendQuote(string $to, string $companyName, string $quoteNumber, string $pdfBinary): array
    {
        if (! self::isConfigured()) {
            return ['sent' => false, 'skipped' => true];
        }

        try {
            Mail::to($to)->send(new QuoteMail($companyName, $quoteNumber, $pdfBinary));

            return ['sent' => true];
        } catch (Throwable $e) {
            return ['sent' => false, 'error' => $e->getMessage()];
        }
    }
}
