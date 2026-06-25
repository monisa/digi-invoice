import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DealsService } from '../deals.service';
import { AccountsService } from '../../accounts/accounts.service';
import { extractApiError } from '../../../core/utils/api-error';
import { DEAL_STAGES, type Account, type Deal, type DealStage } from '../../../core/models/crm.model';

@Component({
  selector: 'app-deal-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './deal-form.html',
  styleUrl: './deal-form.scss',
})
export class DealForm {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DealsService);
  private readonly accountsService = inject(AccountsService);
  private readonly ref = inject(MatDialogRef<DealForm, Deal>);
  readonly data = inject<{ deal?: Deal }>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.deal;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly accounts = signal<Account[]>([]);
  readonly stages = DEAL_STAGES;

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.deal?.name ?? '', Validators.required],
    accountId: [this.data?.deal?.accountId ?? ''],
    stage: [this.data?.deal?.stage ?? ('PROSPECTING' as DealStage)],
    amount: [this.data?.deal?.amount ?? ''],
    currency: [this.data?.deal?.currency ?? 'USD'],
    expectedCloseDate: [this.data?.deal?.expectedCloseDate?.slice(0, 10) ?? ''],
  });

  constructor() {
    this.accountsService.list({ pageSize: 100 }).subscribe({
      next: (res) => this.accounts.set(res.items),
      error: () => undefined,
    });
  }

  stageLabel(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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
      stage: raw.stage,
      amount: raw.amount === '' ? null : raw.amount,
      currency: raw.currency || 'USD',
      expectedCloseDate: raw.expectedCloseDate || null,
    };

    const req$ = this.isEdit
      ? this.service.update(this.data.deal!.id, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: (deal) => this.ref.close(deal),
      error: (err) => {
        this.saving.set(false);
        this.error.set(extractApiError(err, 'Could not save deal'));
      },
    });
  }
}
