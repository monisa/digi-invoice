import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaxRatesService } from '../tax-rates.service';
import { TaxRateForm } from '../tax-rate-form/tax-rate-form';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/utils/api-error';
import type { TaxRate } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-tax-rate-list',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './tax-rate-list.html',
  styleUrl: '../../accounts/account-list/account-list.scss',
})
export class TaxRateList {
  private readonly service = inject(TaxRatesService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<TaxRate[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(false);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly canManage = this.auth.hasAnyRole('ADMIN', 'SALES_MANAGER');
  readonly columns = computed(() =>
    this.canManage ? ['name', 'percentage', 'createdAt', 'actions'] : ['name', 'percentage', 'createdAt'],
  );

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(0);
        this.load();
      });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service
      .list({ page: this.page() + 1, pageSize: this.pageSize(), search: this.searchControl.value })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.snack.open(extractApiError(err, 'Failed to load tax rates'), 'Dismiss', { duration: 5000 });
        },
      });
  }

  onPage(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  openCreate(): void {
    this.dialog
      .open(TaxRateForm, { data: {} })
      .afterClosed()
      .subscribe((result?: TaxRate) => {
        if (result) {
          this.snack.open('Tax rate created', undefined, { duration: 2500 });
          this.load();
        }
      });
  }

  openEdit(taxRate: TaxRate): void {
    this.dialog
      .open(TaxRateForm, { data: { taxRate } })
      .afterClosed()
      .subscribe((result?: TaxRate) => {
        if (result) {
          this.snack.open('Tax rate updated', undefined, { duration: 2500 });
          this.load();
        }
      });
  }

  confirmDelete(taxRate: TaxRate): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Delete tax rate',
          message: `Delete "${taxRate.name}"? Products using it keep their stored values.`,
          confirmLabel: 'Delete',
          destructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.service.remove(taxRate.id).subscribe({
          next: () => {
            this.snack.open('Tax rate deleted', undefined, { duration: 2500 });
            this.load();
          },
          error: (err) =>
            this.snack.open(extractApiError(err, 'Could not delete'), 'Dismiss', { duration: 5000 }),
        });
      });
  }
}
