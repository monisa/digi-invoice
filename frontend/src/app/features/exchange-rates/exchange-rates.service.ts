import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudService } from '../../core/api/crud.service';
import type { ApiEnvelope } from '../../core/models/api.model';
import type { ExchangeRate } from '../../core/models/exchange-rate.model';

export type CreateExchangeRatePayload = {
  baseCurrency: string;
  targetCurrency: string;
  rate: string;
  effectiveDate: string;
};
export type UpdateExchangeRatePayload = { rate?: string; effectiveDate?: string };

export interface SyncResult {
  baseCurrency: string;
  updated: number;
}

@Injectable({ providedIn: 'root' })
export class ExchangeRatesService extends CrudService<
  ExchangeRate,
  CreateExchangeRatePayload,
  UpdateExchangeRatePayload
> {
  protected readonly path = '/exchange-rates';

  /** Pull live rates from the FX provider for the tenant's base currency. */
  sync(): Observable<SyncResult> {
    return this.http
      .post<ApiEnvelope<SyncResult>>(`${this.base}${this.path}/sync`, {})
      .pipe(map((env) => env.data as SyncResult));
  }
}
