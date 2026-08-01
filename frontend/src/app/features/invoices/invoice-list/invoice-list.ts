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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InvoicesService } from '../invoices.service';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/utils/api-error';
import {
  INVOICE_EDITABLE_STATUSES,
  INVOICE_STATUSES,
  invoiceStatusClass,
  invoiceStatusLabel,
  type Invoice,
  type InvoiceStatus,
} from '../../../core/models/invoice.model';

@Component({
  selector: 'app-invoice-list',
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
  templateUrl: './invoice-list.html',
  styleUrl: '../../quotes/quote-list/quote-list.scss',
})
export class InvoiceList {
  private readonly service = inject(InvoicesService);
  private readonly dialog = inject(MatDialog);
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
  readonly canWrite = this.auth.hasAnyRole('ADMIN', 'SALES_MANAGER', 'SALES_REP');
  readonly statusLabel = invoiceStatusLabel;
  readonly statusClass = invoiceStatusClass;
  readonly columns = computed(() =>
    this.canWrite
      ? ['invoiceNumber', 'account', 'status', 'grandTotal', 'dueDate', 'owner', 'actions']
      : ['invoiceNumber', 'account', 'status', 'grandTotal', 'dueDate', 'owner'],
  );

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => { this.page.set(0); this.load(); });
    this.statusFilter.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.page.set(0); this.load(); });
    this.load();
  }

  isEditable(inv: Invoice): boolean {
    return this.canWrite && INVOICE_EDITABLE_STATUSES.includes(inv.status);
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

  confirmDelete(inv: Invoice): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Delete invoice',
          message: `Delete ${inv.invoiceNumber}?`,
          confirmLabel: 'Delete',
          destructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.service.remove(inv.id).subscribe({
          next: () => {
            this.snack.open('Invoice deleted', undefined, { duration: 2500 });
            this.load();
          },
          error: (err) =>
            this.snack.open(extractApiError(err, 'Could not delete'), 'Dismiss', { duration: 5000 }),
        });
      });
  }
}
