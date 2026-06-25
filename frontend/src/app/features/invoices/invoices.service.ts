import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudService } from '../../core/api/crud.service';
import type { ApiEnvelope } from '../../core/models/api.model';
import type { Invoice, InvoiceStatus } from '../../core/models/conversion.model';

@Injectable({ providedIn: 'root' })
export class InvoicesService extends CrudService<Invoice> {
  protected readonly path = '/invoices';

  setStatus(id: string, status: InvoiceStatus): Observable<Invoice> {
    return this.http
      .patch<ApiEnvelope<Invoice>>(`${this.base}${this.path}/${id}/status`, { status })
      .pipe(map((e) => e.data!));
  }
}
