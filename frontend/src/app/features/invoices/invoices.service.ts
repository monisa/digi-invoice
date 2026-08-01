import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudService } from '../../core/api/crud.service';
import type { ApiEnvelope } from '../../core/models/api.model';
import type { Invoice, InvoicePayload, InvoiceStatus } from '../../core/models/invoice.model';

@Injectable({ providedIn: 'root' })
export class InvoicesService extends CrudService<Invoice, InvoicePayload, InvoicePayload> {
  protected readonly path = '/invoices';

  setStatus(id: string, status: InvoiceStatus): Observable<Invoice> {
    return this.http
      .patch<ApiEnvelope<Invoice>>(`${this.base}${this.path}/${id}/status`, { status })
      .pipe(map((e) => e.data!));
  }

  /** Fetch the invoice PDF as a blob (auth handled by the interceptor). */
  downloadPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.base}${this.path}/${id}/pdf`, { responseType: 'blob' });
  }
}
