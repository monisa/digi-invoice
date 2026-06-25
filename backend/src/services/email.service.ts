import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

/**
 * Email via SMTP (Nodemailer). When SMTP_HOST is not configured the service is
 * a no-op that reports `sent: false, skipped: true`, so flows like "send quote"
 * still succeed in dev/unconfigured environments. Configure real SMTP per
 * tenant or a shared sender in production (Hostinger env vars).
 */

export interface SendResult {
  sent: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

export interface QuoteEmailInput {
  to: string;
  companyName: string;
  quoteNumber: string;
  pdf: Buffer;
}

let transporter: Transporter | null = null;
function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export const EmailService = {
  isConfigured(): boolean {
    return !!env.SMTP_HOST;
  },

  async sendQuote(input: QuoteEmailInput): Promise<SendResult> {
    const tx = getTransporter();
    if (!tx) return { sent: false, skipped: true };

    try {
      const info = await tx.sendMail({
        from: env.MAIL_FROM,
        to: input.to,
        subject: `Quote ${input.quoteNumber} from ${input.companyName}`,
        text: `Hi,\n\nPlease find attached quote ${input.quoteNumber} from ${input.companyName}.\n\nThank you.`,
        attachments: [
          { filename: `${input.quoteNumber}.pdf`, content: input.pdf, contentType: 'application/pdf' },
        ],
      });
      return { sent: true, messageId: info.messageId };
    } catch (err) {
      return { sent: false, error: (err as Error).message };
    }
  },
};
