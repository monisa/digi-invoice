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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuotesService } from '../quotes.service';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/utils/api-error';
import { QUOTE_STATUSES, statusClass, statusLabel } from '../quote-status';
import { EDITABLE_STATUSES, type Quote, type QuoteStatus } from '../../../core/models/quote.model';

@Component({
  selector: 'app-quote-list',
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
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './quote-list.html',
  styleUrl: './quote-list.scss',
})
export class QuoteList {
  private readonly service = inject(QuotesService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Quote[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(false);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusFilter = new FormControl<QuoteStatus | ''>('', { nonNullable: true });
  readonly statuses = QUOTE_STATUSES;

  readonly canWrite = this.auth.hasAnyRole('ADMIN', 'SALES_MANAGER', 'SALES_REP');
  readonly columns = computed(() => [
    'quoteNumber',
    'account',
    'status',
    'grandTotal',
    'validUntil',
    'owner',
    'actions',
  ]);

  readonly statusLabel = statusLabel;
  readonly statusClass = statusClass;

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(0);
        this.load();
      });
    this.statusFilter.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.page.set(0);
      this.load();
    });
    this.load();
  }

  isEditable(q: Quote): boolean {
    return this.canWrite && EDITABLE_STATUSES.includes(q.status);
  }

  load(): void {
    this.loading.set(true);
    this.service
      .list({
        page: this.page() + 1,
        pageSize: this.pageSize(),
        search: this.searchControl.value,
        status: this.statusFilter.value || undefined,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.snack.open(extractApiError(err, 'Failed to load quotes'), 'Dismiss', { duration: 5000 });
        },
      });
  }

  onPage(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  confirmDelete(quote: Quote): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Delete quote',
          message: `Delete ${quote.quoteNumber}?`,
          confirmLabel: 'Delete',
          destructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.service.remove(quote.id).subscribe({
          next: () => {
            this.snack.open('Quote deleted', undefined, { duration: 2500 });
            this.load();
          },
          error: (err) =>
            this.snack.open(extractApiError(err, 'Could not delete'), 'Dismiss', { duration: 5000 }),
        });
      });
  }
}
