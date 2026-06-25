import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiEnvelope } from '../../core/models/api.model';
import type { PublicQuoteView } from '../../core/models/quote.model';

export interface SignPayload {
  signerName: string;
  signerEmail?: string;
  signatureImage?: string;
}

@Injectable({ providedIn: 'root' })
export class PublicQuoteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/public/quotes`;

  get(token: string): Observable<PublicQuoteView> {
    return this.http.get<ApiEnvelope<PublicQuoteView>>(`${this.base}/${token}`).pipe(map((e) => e.data!));
  }

  sign(token: string, payload: SignPayload): Observable<{ status: string }> {
    return this.http
      .post<ApiEnvelope<{ status: string }>>(`${this.base}/${token}/sign`, payload)
      .pipe(map((e) => e.data!));
  }

  decline(token: string, reason?: string): Observable<{ status: string }> {
    return this.http
      .post<ApiEnvelope<{ status: string }>>(`${this.base}/${token}/decline`, { reason })
      .pipe(map((e) => e.data!));
  }
}
