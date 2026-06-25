import { Injectable } from '@angular/core';
import { CrudService } from '../../core/api/crud.service';
import type { Quote, QuotePayload } from '../../core/models/quote.model';

@Injectable({ providedIn: 'root' })
export class QuotesService extends CrudService<Quote, QuotePayload, QuotePayload> {
  protected readonly path = '/quotes';
}
