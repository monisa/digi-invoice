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
import { CommentDialog } from '../../../shared/comment-dialog/comment-dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/utils/api-error';
import { statusClass, statusLabel } from '../quote-status';
import { EDITABLE_STATUSES, type Quote } from '../../../core/models/quote.model';
import type { Observable } from 'rxjs';

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
  readonly canApprove = this.auth.hasAnyRole('ADMIN', 'SALES_MANAGER');
  readonly acting = signal(false);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  canEdit(): boolean {
    const q = this.quote();
    return !!q && this.canWrite && EDITABLE_STATUSES.includes(q.status);
  }

  canShare(): boolean {
    const q = this.quote();
    return !!q && this.canWrite && q.status === 'SENT';
  }

  canConvert(): boolean {
    const q = this.quote();
    return !!q && this.canApprove && (q.status === 'ACCEPTED' || q.status === 'APPROVED');
  }

  convertToOrder(): void {
    const q = this.quote();
    if (!q) return;
    this.acting.set(true);
    this.service.convertToOrder(q.id).subscribe({
      next: (order) => {
        this.acting.set(false);
        this.snack.open(`Created sales order ${order.orderNumber}`, undefined, { duration: 3000 });
        void this.router.navigate(['/sales-orders']);
      },
      error: (err) => {
        this.acting.set(false);
        this.snack.open(extractApiError(err, 'Could not convert'), 'Dismiss', { duration: 5000 });
      },
    });
  }

  copySigningLink(): void {
    const q = this.quote();
    if (!q) return;
    this.service.signingLink(q.id).subscribe({
      next: (token) => {
        const url = `${window.location.origin}/sign/${token}`;
        navigator.clipboard?.writeText(url).then(
          () => this.snack.open('Signing link copied to clipboard', undefined, { duration: 3000 }),
          () => this.snack.open(url, 'Dismiss'),
        );
      },
      error: (err) =>
        this.snack.open(extractApiError(err, 'Could not create signing link'), 'Dismiss', { duration: 5000 }),
    });
  }

  downloadPdf(): void {
    const q = this.quote();
    if (!q) return;
    this.acting.set(true);
    this.service.downloadPdf(q.id).subscribe({
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

  canSubmit(): boolean {
    const q = this.quote();
    return !!q && this.canWrite && (q.status === 'DRAFT' || q.status === 'REJECTED');
  }

  canDecide(): boolean {
    return !!this.quote() && this.canApprove && this.quote()!.status === 'PENDING_APPROVAL';
  }

  canSend(): boolean {
    const q = this.quote();
    return !!q && this.canWrite && (q.status === 'APPROVED' || q.status === 'DRAFT');
  }

  submit(): void {
    this.runWithComment(
      { title: 'Submit for approval', confirmLabel: 'Submit' },
      (c) => this.service.submitForApproval(this.quote()!.id, c),
    );
  }

  approve(): void {
    this.runWithComment(
      { title: 'Approve quote', confirmLabel: 'Approve' },
      (c) => this.service.approve(this.quote()!.id, c),
    );
  }

  reject(): void {
    this.runWithComment(
      { title: 'Reject quote', confirmLabel: 'Reject', required: true, destructive: true },
      (c) => this.service.reject(this.quote()!.id, c),
    );
  }

  send(): void {
    this.runAction(this.service.send(this.quote()!.id), 'Quote sent');
  }

  private runWithComment(
    dialogData: { title: string; confirmLabel: string; required?: boolean; destructive?: boolean },
    op: (comments?: string) => Observable<Quote>,
  ): void {
    this.dialog
      .open(CommentDialog, { data: dialogData })
      .afterClosed()
      .subscribe((result?: { comments?: string }) => {
        if (!result) return;
        this.runAction(op(result.comments), `Quote ${dialogData.confirmLabel.toLowerCase()}d`);
      });
  }

  private runAction(op$: Observable<Quote>, successMsg: string): void {
    this.acting.set(true);
    op$.subscribe({
      next: (quote) => {
        this.acting.set(false);
        this.quote.set(quote);
        this.snack.open(successMsg, undefined, { duration: 2500 });
      },
      error: (err) => {
        this.acting.set(false);
        this.snack.open(extractApiError(err, 'Action failed'), 'Dismiss', { duration: 5000 });
      },
    });
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
