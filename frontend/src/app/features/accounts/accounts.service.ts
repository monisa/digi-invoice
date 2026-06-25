import { Injectable } from '@angular/core';
import { CrudService } from '../../core/api/crud.service';
import type { Account } from '../../core/models/crm.model';

export type AccountPayload = {
  name?: string;
  industry?: string | null;
  website?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
};

@Injectable({ providedIn: 'root' })
export class AccountsService extends CrudService<Account, AccountPayload, AccountPayload> {
  protected readonly path = '/accounts';
}
