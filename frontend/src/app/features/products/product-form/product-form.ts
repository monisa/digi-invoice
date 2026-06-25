import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProductsService } from '../products.service';
import { TaxRatesService } from '../../tax-rates/tax-rates.service';
import { extractApiError } from '../../../core/utils/api-error';
import type { Product, TaxRate } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-product-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
})
export class ProductForm {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProductsService);
  private readonly taxRatesService = inject(TaxRatesService);
  private readonly ref = inject(MatDialogRef<ProductForm, Product>);
  readonly data = inject<{ product?: Product }>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.product;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly taxRates = signal<TaxRate[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.product?.name ?? '', Validators.required],
    sku: [this.data?.product?.sku ?? ''],
    unitPrice: [this.data?.product?.unitPrice ?? '', [Validators.required, Validators.min(0)]],
    currency: [this.data?.product?.currency ?? 'USD', Validators.required],
    taxRateId: [this.data?.product?.taxRateId ?? ''],
    description: [this.data?.product?.description ?? ''],
  });

  constructor() {
    this.taxRatesService.list({ pageSize: 100 }).subscribe({
      next: (res) => this.taxRates.set(res.items),
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
      sku: raw.sku || null,
      unitPrice: raw.unitPrice,
      currency: raw.currency,
      taxRateId: raw.taxRateId || null,
      description: raw.description || null,
    };

    const req$ = this.isEdit
      ? this.service.update(this.data.product!.id, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: (product) => this.ref.close(product),
      error: (err) => {
        this.saving.set(false);
        this.error.set(extractApiError(err, 'Could not save product'));
      },
    });
  }
}
