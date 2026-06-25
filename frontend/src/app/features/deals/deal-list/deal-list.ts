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
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DealsService } from '../deals.service';
import { DealForm } from '../deal-form/deal-form';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/utils/api-error';
import { DEAL_STAGES, type Deal, type DealStage } from '../../../core/models/crm.model';

@Component({
  selector: 'app-deal-list',
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
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './deal-list.html',
  styleUrl: '../../accounts/account-list/account-list.scss',
})
export class DealList {
  private readonly service = inject(DealsService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Deal[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(false);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly stageFilter = new FormControl<DealStage | ''>('', { nonNullable: true });
  readonly stages = DEAL_STAGES;

  readonly canWrite = this.auth.hasAnyRole('ADMIN', 'SALES_MANAGER', 'SALES_REP');
  readonly columns = computed(() =>
    this.canWrite
      ? ['name', 'account', 'stage', 'amount', 'expectedCloseDate', 'actions']
      : ['name', 'account', 'stage', 'amount', 'expectedCloseDate'],
  );

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(0);
        this.load();
      });
    this.stageFilter.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.page.set(0);
      this.load();
    });
    this.load();
  }

  stageLabel(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  load(): void {
    this.loading.set(true);
    this.service
      .list({
        page: this.page() + 1,
        pageSize: this.pageSize(),
        search: this.searchControl.value,
        stage: this.stageFilter.value || undefined,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.snack.open(extractApiError(err, 'Failed to load deals'), 'Dismiss', { duration: 5000 });
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
      .open(DealForm, { data: {} })
      .afterClosed()
      .subscribe((result?: Deal) => {
        if (result) {
          this.snack.open('Deal created', undefined, { duration: 2500 });
          this.load();
        }
      });
  }

  openEdit(deal: Deal): void {
    this.dialog
      .open(DealForm, { data: { deal } })
      .afterClosed()
      .subscribe((result?: Deal) => {
        if (result) {
          this.snack.open('Deal updated', undefined, { duration: 2500 });
          this.load();
        }
      });
  }

  confirmDelete(deal: Deal): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Delete deal',
          message: `Delete "${deal.name}"?`,
          confirmLabel: 'Delete',
          destructive: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.service.remove(deal.id).subscribe({
          next: () => {
            this.snack.open('Deal deleted', undefined, { duration: 2500 });
            this.load();
          },
          error: (err) =>
            this.snack.open(extractApiError(err, 'Could not delete'), 'Dismiss', { duration: 5000 }),
        });
      });
  }
}
