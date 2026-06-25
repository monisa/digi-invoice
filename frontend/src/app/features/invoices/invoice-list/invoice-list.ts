import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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
import { InvoicesService } from '../invoices.service';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/utils/api-error';
import {
  INVOICE_STATUSES,
  convStatusClass,
  convStatusLabel,
  type Invoice,
  type InvoiceStatus,
} from '../../../core/models/conversion.model';

@Component({
  selector: 'app-invoice-list',
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
  templateUrl: './invoice-list.html',
  styleUrl: '../../quotes/quote-list/quote-list.scss',
})
export class InvoiceList {
  private readonly service = inject(InvoicesService);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Invoice[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(false);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusFilter = new FormControl<InvoiceStatus | ''>('', { nonNullable: true });
  readonly statuses = INVOICE_STATUSES;
  readonly canManage = this.auth.hasAnyRole('ADMIN', 'SALES_MANAGER');
  readonly statusLabel = convStatusLabel;
  readonly statusClass = convStatusClass;
  readonly columns = computed(() =>
    this.canManage
      ? ['invoiceNumber', 'order', 'account', 'total', 'dueDate', 'status', 'actions']
      : ['invoiceNumber', 'order', 'account', 'total', 'dueDate', 'status'],
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
        error: (err) => { this.loading.set(false); this.snack.open(extractApiError(err, 'Failed to load invoices'), 'Dismiss', { duration: 5000 }); },
      });
  }

  onPage(e: PageEvent): void { this.page.set(e.pageIndex); this.pageSize.set(e.pageSize); this.load(); }

  setStatus(inv: Invoice, status: InvoiceStatus): void {
    this.service.setStatus(inv.id, status).subscribe({
      next: () => { this.snack.open('Invoice updated', undefined, { duration: 2000 }); this.load(); },
      error: (err) => this.snack.open(extractApiError(err, 'Update failed'), 'Dismiss', { duration: 5000 }),
    });
  }
}
