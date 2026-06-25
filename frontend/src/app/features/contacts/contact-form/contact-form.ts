import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ContactsService } from '../contacts.service';
import { AccountsService } from '../../accounts/accounts.service';
import { extractApiError } from '../../../core/utils/api-error';
import type { Account, Contact } from '../../../core/models/crm.model';

@Component({
  selector: 'app-contact-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.scss',
})
export class ContactForm {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ContactsService);
  private readonly accountsService = inject(AccountsService);
  private readonly ref = inject(MatDialogRef<ContactForm, Contact>);
  readonly data = inject<{ contact?: Contact }>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.contact;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly accounts = signal<Account[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.contact?.name ?? '', Validators.required],
    accountId: [this.data?.contact?.accountId ?? ''],
    email: [this.data?.contact?.email ?? '', Validators.email],
    phone: [this.data?.contact?.phone ?? ''],
  });

  constructor() {
    this.accountsService.list({ pageSize: 100 }).subscribe({
      next: (res) => this.accounts.set(res.items),
      error: () => undefined,
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name,
      accountId: raw.accountId || null,
      email: raw.email || null,
      phone: raw.phone || null,
    };

    const req$ = this.isEdit
      ? this.service.update(this.data.contact!.id, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: (contact) => this.ref.close(contact),
      error: (err) => {
        this.saving.set(false);
        this.error.set(extractApiError(err, 'Could not save contact'));
      },
    });
  }
}
