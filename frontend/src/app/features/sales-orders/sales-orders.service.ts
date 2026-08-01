import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudService } from '../../core/api/crud.service';
import type { ApiEnvelope } from '../../core/models/api.model';
import type { SalesOrder, SalesOrderStatus } from '../../core/models/conversion.model';
import type { Invoice } from '../../core/models/invoice.model';

@Injectable({ providedIn: 'root' })
export class SalesOrdersService extends CrudService<SalesOrder> {
  protected readonly path = '/sales-orders';

  setStatus(id: string, status: SalesOrderStatus): Observable<SalesOrder> {
    return this.http
      .patch<ApiEnvelope<SalesOrder>>(`${this.base}${this.path}/${id}/status`, { status })
      .pipe(map((e) => e.data!));
  }

  convertToInvoice(id: string): Observable<Invoice> {
    return this.http
      .post<ApiEnvelope<Invoice>>(`${this.base}${this.path}/${id}/convert-to-invoice`, {})
      .pipe(map((e) => e.data!));
  }
}
