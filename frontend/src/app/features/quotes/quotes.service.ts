import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudService } from '../../core/api/crud.service';
import type { ApiEnvelope } from '../../core/models/api.model';
import type { Quote, QuotePayload } from '../../core/models/quote.model';

@Injectable({ providedIn: 'root' })
export class QuotesService extends CrudService<Quote, QuotePayload, QuotePayload> {
  protected readonly path = '/quotes';

  private action(id: string, action: string, comments?: string): Observable<Quote> {
    return this.http
      .post<ApiEnvelope<Quote>>(`${this.base}${this.path}/${id}/${action}`, { comments })
      .pipe(map((env) => env.data as Quote));
  }

  submitForApproval(id: string, comments?: string): Observable<Quote> {
    return this.action(id, 'submit-for-approval', comments);
  }
  approve(id: string, comments?: string): Observable<Quote> {
    return this.action(id, 'approve', comments);
  }
  reject(id: string, comments?: string): Observable<Quote> {
    return this.action(id, 'reject', comments);
  }
  send(id: string, comments?: string): Observable<Quote> {
    return this.action(id, 'send', comments);
  }
}
