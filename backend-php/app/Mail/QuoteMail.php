<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Mirrors the message built by EmailService.sendQuote() in email.service.ts. */
class QuoteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $companyName,
        public readonly string $quoteNumber,
        public readonly string $pdfBinary,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Quote {$this->quoteNumber} from {$this->companyName}");
    }

    public function content(): Content
    {
        return new Content(text: 'emails.quote-plain', with: [
            'companyName' => $this->companyName,
            'quoteNumber' => $this->quoteNumber,
        ]);
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfBinary, "{$this->quoteNumber}.pdf")
                ->withMime('application/pdf'),
        ];
    }
}
