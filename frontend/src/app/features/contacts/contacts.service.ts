import { Injectable } from '@angular/core';
import { CrudService } from '../../core/api/crud.service';
import type { Contact } from '../../core/models/crm.model';

export type ContactPayload = {
  name?: string;
  accountId?: string | null;
  email?: string | null;
  phone?: string | null;
};

@Injectable({ providedIn: 'root' })
export class ContactsService extends CrudService<Contact, ContactPayload, ContactPayload> {
  protected readonly path = '/contacts';
}
