import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
} from '../../../core/models/invoice.model';

@Component({
  selector: 'app-invoice-detail',
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    MatProgressBarModule,
  ],
  templateUrl: './invoice-detail.html',
  styleUrl: '../../quotes/quote-detail/quote-detail.scss',
})
export class InvoiceDetail {
  private readonly service = inject(InvoicesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  readonly invoice = signal<Invoice | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly acting = signal(false);

  readonly lineColumns = ['description', 'quantity', 'unitPrice', 'discountPct', 'lineTotal'];
  readonly statusLabel = invoiceStatusLabel;
  readonly statusClass = invoiceStatusClass;
  readonly statuses = INVOICE_STATUSES;
  readonly canWrite = this.auth.hasAnyRole('ADMIN', 'SALES_MANAGER', 'SALES_REP');
  readonly canManageStatus = this.auth.hasAnyRole('ADMIN', 'SALES_MANAGER');

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  canEdit(): boolean {
    const inv = this.invoice();
    return !!inv && this.canWrite && INVOICE_EDITABLE_STATUSES.includes(inv.status);
  }

  canDelete(): boolean {
    return this.canEdit();
  }

  setStatus(status: (typeof INVOICE_STATUSES)[number]): void {
    const inv = this.invoice();
    if (!inv) return;
    this.acting.set(true);
    this.service.setStatus(inv.id, status).subscribe({
      next: (updated) => {
        this.acting.set(false);
        this.invoice.set(updated);
        this.snack.open('Invoice updated', undefined, { duration: 2500 });
      },
      error: (err) => {
        this.acting.set(false);
        this.snack.open(extractApiError(err, 'Update failed'), 'Dismiss', { duration: 5000 });
      },
    });
  }

  downloadPdf(): void {
    const inv = this.invoice();
    if (!inv) return;
    this.acting.set(true);
    this.service.downloadPdf(inv.id).subscribe({
      next: (blob) => {
        this.acting.set(false);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: (err) => {
        this.acting.set(false);
        this.snack.open(extractApiError(err, 'Could not generate PDF'), 'Dismiss', { duration: 5000 });
      },
    });
  }

  confirmDelete(): void {
    const inv = this.invoice();
    if (!inv) return;
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
            void this.router.navigate(['/invoices']);
          },
          error: (err) =>
            this.snack.open(extractApiError(err, 'Could not delete'), 'Dismiss', { duration: 5000 }),
        });
      });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.service.get(id).subscribe({
      next: (invoice) => {
        this.invoice.set(invoice);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiError(err, 'Invoice not found'));
      },
    });
  }
}
