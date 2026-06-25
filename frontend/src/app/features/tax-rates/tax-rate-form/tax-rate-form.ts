import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TaxRatesService } from '../tax-rates.service';
import { extractApiError } from '../../../core/utils/api-error';
import type { TaxRate } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-tax-rate-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './tax-rate-form.html',
  styleUrl: '../../accounts/account-form/account-form.scss',
})
export class TaxRateForm {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TaxRatesService);
  private readonly ref = inject(MatDialogRef<TaxRateForm, TaxRate>);
  readonly data = inject<{ taxRate?: TaxRate }>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.taxRate;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.taxRate?.name ?? '', Validators.required],
    percentage: [
      this.data?.taxRate?.percentage ?? '',
      [Validators.required, Validators.min(0), Validators.max(100)],
    ],
  });

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const payload = this.form.getRawValue();
    const req$ = this.isEdit
      ? this.service.update(this.data.taxRate!.id, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: (taxRate) => this.ref.close(taxRate),
      error: (err) => {
        this.saving.set(false);
        this.error.set(extractApiError(err, 'Could not save tax rate'));
      },
    });
  }
}
