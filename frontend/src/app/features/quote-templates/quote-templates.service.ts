import { Injectable } from '@angular/core';
import { CrudService } from '../../core/api/crud.service';
import type { QuoteTemplate } from '../../core/models/quote-template.model';

export type QuoteTemplatePayload = {
  name?: string;
  headerHtml?: string | null;
  footerHtml?: string | null;
  termsHtml?: string | null;
  isDefault?: boolean;
};

@Injectable({ providedIn: 'root' })
export class QuoteTemplatesService extends CrudService<
  QuoteTemplate,
  QuoteTemplatePayload,
  QuoteTemplatePayload
> {
  protected readonly path = '/quote-templates';
}
