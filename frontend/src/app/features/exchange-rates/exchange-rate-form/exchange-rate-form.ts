import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ExchangeRatesService } from '../exchange-rates.service';
import { extractApiError } from '../../../core/utils/api-error';
import type { ExchangeRate } from '../../../core/models/exchange-rate.model';

const CURRENCY = /^[A-Za-z]{3}$/;

@Component({
  selector: 'app-exchange-rate-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './exchange-rate-form.html',
  styleUrl: '../../accounts/account-form/account-form.scss',
})
export class ExchangeRateForm {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ExchangeRatesService);
  private readonly ref = inject(MatDialogRef<ExchangeRateForm, ExchangeRate>);
  readonly data = inject<{ rate?: ExchangeRate }>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.rate;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    baseCurrency: [
      { value: this.data?.rate?.baseCurrency ?? '', disabled: this.isEdit },
      [Validators.required, Validators.pattern(CURRENCY)],
    ],
    targetCurrency: [
      { value: this.data?.rate?.targetCurrency ?? '', disabled: this.isEdit },
      [Validators.required, Validators.pattern(CURRENCY)],
    ],
    rate: [this.data?.rate?.rate ?? '', [Validators.required, Validators.min(0)]],
    effectiveDate: [
      this.data?.rate?.effectiveDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      Validators.required,
    ],
  });

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    const req$ = this.isEdit
      ? this.service.update(this.data.rate!.id, { rate: v.rate, effectiveDate: v.effectiveDate })
      : this.service.create({
          baseCurrency: v.baseCurrency.toUpperCase(),
          targetCurrency: v.targetCurrency.toUpperCase(),
          rate: v.rate,
          effectiveDate: v.effectiveDate,
        });

    req$.subscribe({
      next: (rate) => this.ref.close(rate),
      error: (err) => {
        this.saving.set(false);
        this.error.set(extractApiError(err, 'Could not save exchange rate'));
      },
    });
  }
}
