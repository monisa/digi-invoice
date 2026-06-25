import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalesOrdersService } from '../sales-orders.service';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/utils/api-error';
import {
  SALES_ORDER_STATUSES,
  convStatusClass,
  convStatusLabel,
  type SalesOrder,
  type SalesOrderStatus,
} from '../../../core/models/conversion.model';

@Component({
  selector: 'app-sales-order-list',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './sales-order-list.html',
  styleUrl: '../../quotes/quote-list/quote-list.scss',
})
export class SalesOrderList {
  private readonly service = inject(SalesOrdersService);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<SalesOrder[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(false);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusFilter = new FormControl<SalesOrderStatus | ''>('', { nonNullable: true });
  readonly statuses = SALES_ORDER_STATUSES;
  readonly canManage = this.auth.hasAnyRole('ADMIN', 'SALES_MANAGER');
  readonly statusLabel = convStatusLabel;
  readonly statusClass = convStatusClass;
  readonly columns = computed(() =>
    this.canManage
      ? ['orderNumber', 'quote', 'account', 'total', 'status', 'actions']
      : ['orderNumber', 'quote', 'account', 'total', 'status'],
  );

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => { this.page.set(0); this.load(); });
    this.statusFilter.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.page.set(0); this.load(); });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service
      .list({ page: this.page() + 1, pageSize: this.pageSize(), search: this.searchControl.value, status: this.statusFilter.value || undefined })
      .subscribe({
        next: (res) => { this.items.set(res.items); this.total.set(res.meta.total); this.loading.set(false); },
        error: (err) => { this.loading.set(false); this.snack.open(extractApiError(err, 'Failed to load orders'), 'Dismiss', { duration: 5000 }); },
      });
  }

  onPage(e: PageEvent): void { this.page.set(e.pageIndex); this.pageSize.set(e.pageSize); this.load(); }

  setStatus(o: SalesOrder, status: SalesOrderStatus): void {
    this.service.setStatus(o.id, status).subscribe({
      next: () => { this.snack.open('Order updated', undefined, { duration: 2000 }); this.load(); },
      error: (err) => this.snack.open(extractApiError(err, 'Update failed'), 'Dismiss', { duration: 5000 }),
    });
  }

  convertToInvoice(o: SalesOrder): void {
    this.service.convertToInvoice(o.id).subscribe({
      next: (inv) => { this.snack.open(`Created invoice ${inv.invoiceNumber}`, undefined, { duration: 3000 }); this.load(); },
      error: (err) => this.snack.open(extractApiError(err, 'Could not invoice'), 'Dismiss', { duration: 5000 }),
    });
  }
}
