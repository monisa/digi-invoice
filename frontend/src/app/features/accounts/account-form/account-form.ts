import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AccountsService } from '../accounts.service';
import { extractApiError } from '../../../core/utils/api-error';
import type { Account } from '../../../core/models/crm.model';

@Component({
  selector: 'app-account-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './account-form.html',
  styleUrl: './account-form.scss',
})
export class AccountForm {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AccountsService);
  private readonly ref = inject(MatDialogRef<AccountForm, Account>);
  readonly data = inject<{ account?: Account }>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.account;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.account?.name ?? '', Validators.required],
    industry: [this.data?.account?.industry ?? ''],
    website: [this.data?.account?.website ?? '', websiteValidator],
    billingAddress: [this.data?.account?.billingAddress ?? ''],
    shippingAddress: [this.data?.account?.shippingAddress ?? ''],
  });

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    // Send empty optional fields as null so the API can clear them.
    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name,
      industry: raw.industry || null,
      website: raw.website || null,
      billingAddress: raw.billingAddress || null,
      shippingAddress: raw.shippingAddress || null,
    };

    const req$ = this.isEdit
      ? this.service.update(this.data.account!.id, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: (account) => this.ref.close(account),
      error: (err) => {
        this.saving.set(false);
        this.error.set(extractApiError(err, 'Could not save account'));
      },
    });
  }
}

import { AbstractControl, ValidationErrors } from '@angular/forms';
function websiteValidator(control: AbstractControl): ValidationErrors | null {
  const v = (control.value as string)?.trim();
  if (!v) return null;
  return /^https?:\/\/.+/.test(v) ? null : { url: true };
}
