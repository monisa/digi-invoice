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

  /** Fetch the quote PDF as a blob (auth handled by the interceptor). */
  downloadPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.base}${this.path}/${id}/pdf`, { responseType: 'blob' });
  }

  /** Convert an accepted/approved quote to a sales order. */
  convertToOrder(id: string): Observable<{ id: string; orderNumber: string }> {
    return this.http
      .post<ApiEnvelope<{ id: string; orderNumber: string }>>(
        `${this.base}${this.path}/${id}/convert-to-order`,
        {},
      )
      .pipe(map((env) => env.data!));
  }

  /** Ensure a public signing token exists; returns it. */
  signingLink(id: string): Observable<string> {
    return this.http
      .post<ApiEnvelope<{ token: string }>>(`${this.base}${this.path}/${id}/signing-link`, {})
      .pipe(map((env) => env.data!.token));
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
