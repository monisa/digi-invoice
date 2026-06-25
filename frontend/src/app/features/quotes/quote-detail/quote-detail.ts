import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuotesService } from '../quotes.service';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/utils/api-error';
import { statusClass, statusLabel } from '../quote-status';
import { EDITABLE_STATUSES, type Quote } from '../../../core/models/quote.model';

@Component({
  selector: 'app-quote-detail',
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
  ],
  templateUrl: './quote-detail.html',
  styleUrl: './quote-detail.scss',
})
export class QuoteDetail {
  private readonly service = inject(QuotesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  readonly quote = signal<Quote | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly lineColumns = ['description', 'quantity', 'unitPrice', 'discountPct', 'lineTotal'];
  readonly statusLabel = statusLabel;
  readonly statusClass = statusClass;
  readonly canWrite = this.auth.hasAnyRole('ADMIN', 'SALES_MANAGER', 'SALES_REP');

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  canEdit(): boolean {
    const q = this.quote();
    return !!q && this.canWrite && EDITABLE_STATUSES.includes(q.status);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.service.get(id).subscribe({
      next: (quote) => {
        this.quote.set(quote);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiError(err, 'Quote not found'));
      },
    });
  }

  confirmDelete(): void {
    const q = this.quote();
    if (!q) return;
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Delete quote',
          message: `Delete ${q.quoteNumber}?`,
          confirmLabel: 'Delete',
          destructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.service.remove(q.id).subscribe({
          next: () => {
            this.snack.open('Quote deleted', undefined, { duration: 2500 });
            void this.router.navigate(['/quotes']);
          },
          error: (err) =>
            this.snack.open(extractApiError(err, 'Could not delete'), 'Dismiss', { duration: 5000 }),
        });
      });
  }
}
