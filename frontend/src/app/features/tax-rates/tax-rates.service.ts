import { Injectable } from '@angular/core';
import { CrudService } from '../../core/api/crud.service';
import type { TaxRate } from '../../core/models/catalog.model';

export type TaxRatePayload = { name?: string; percentage?: string };

@Injectable({ providedIn: 'root' })
export class TaxRatesService extends CrudService<TaxRate, TaxRatePayload, TaxRatePayload> {
  protected readonly path = '/tax-rates';
}
