import { Injectable } from '@angular/core';
import { CrudService } from '../../core/api/crud.service';
import type { Deal, DealStage } from '../../core/models/crm.model';

export type DealPayload = {
  name?: string;
  accountId?: string | null;
  stage?: DealStage;
  amount?: string | null;
  currency?: string;
  expectedCloseDate?: string | null;
};

@Injectable({ providedIn: 'root' })
export class DealsService extends CrudService<Deal, DealPayload, DealPayload> {
  protected readonly path = '/deals';
}
