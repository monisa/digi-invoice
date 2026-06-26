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
import { ExchangeRatesService } from '../exchange-rates.service';
import { ExchangeRateForm } from '../exchange-rate-form/exchange-rate-form';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/utils/api-error';
import type { ExchangeRate } from '../../../core/models/exchange-rate.model';

@Component({
  selector: 'app-exchange-rate-list',
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
  templateUrl: './exchange-rate-list.html',
  styleUrl: '../../accounts/account-list/account-list.scss',
})
export class ExchangeRateList {
  private readonly service = inject(ExchangeRatesService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<ExchangeRate[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(false);
  readonly syncing = signal(false);

  readonly baseControl = new FormControl('', { nonNullable: true });
  readonly targetControl = new FormControl('', { nonNullable: true });
  readonly canManage = this.auth.hasAnyRole('ADMIN', 'SALES_MANAGER');
  readonly columns = computed(() =>
    this.canManage
      ? ['baseCurrency', 'targetCurrency', 'rate', 'effectiveDate', 'actions']
      : ['baseCurrency', 'targetCurrency', 'rate', 'effectiveDate'],
  );

  constructor() {
    for (const control of [this.baseControl, this.targetControl]) {
      control.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.page.set(0);
          this.load();
        });
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const base = this.baseControl.value.trim();
    const target = this.targetControl.value.trim();
    this.service
      .list({
        page: this.page() + 1,
        pageSize: this.pageSize(),
        baseCurrency: base ? base.toUpperCase() : undefined,
        targetCurrency: target ? target.toUpperCase() : undefined,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.snack.open(extractApiError(err, 'Failed to load exchange rates'), 'Dismiss', {
            duration: 5000,
          });
        },
      });
  }

  onPage(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  syncRates(): void {
    if (this.syncing()) return;
    this.syncing.set(true);
    this.service.sync().subscribe({
      next: (res) => {
        this.syncing.set(false);
        this.snack.open(
          `Synced ${res.updated} rate(s) for ${res.baseCurrency}`,
          undefined,
          { duration: 2500 },
        );
        this.page.set(0);
        this.load();
      },
      error: (err) => {
        this.syncing.set(false);
        this.snack.open(extractApiError(err, 'Could not sync rates'), 'Dismiss', { duration: 5000 });
      },
    });
  }

  openCreate(): void {
    this.dialog
      .open(ExchangeRateForm, { data: {} })
      .afterClosed()
      .subscribe((result?: ExchangeRate) => {
        if (result) {
          this.snack.open('Exchange rate created', undefined, { duration: 2500 });
          this.load();
        }
      });
  }

  openEdit(rate: ExchangeRate): void {
    this.dialog
      .open(ExchangeRateForm, { data: { rate } })
      .afterClosed()
      .subscribe((result?: ExchangeRate) => {
        if (result) {
          this.snack.open('Exchange rate updated', undefined, { duration: 2500 });
          this.load();
        }
      });
  }

  confirmDelete(rate: ExchangeRate): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Delete exchange rate',
          message: `Delete the ${rate.baseCurrency} → ${rate.targetCurrency} rate for ${rate.effectiveDate.slice(0, 10)}?`,
          confirmLabel: 'Delete',
          destructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.service.remove(rate.id).subscribe({
          next: () => {
            this.snack.open('Exchange rate deleted', undefined, { duration: 2500 });
            this.load();
          },
          error: (err) =>
            this.snack.open(extractApiError(err, 'Could not delete'), 'Dismiss', { duration: 5000 }),
        });
      });
  }
}
