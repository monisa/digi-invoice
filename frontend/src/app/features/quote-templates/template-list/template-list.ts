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
import { QuoteTemplatesService } from '../quote-templates.service';
import { TemplateForm } from '../template-form/template-form';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/utils/api-error';
import type { QuoteTemplate } from '../../../core/models/quote-template.model';

@Component({
  selector: 'app-template-list',
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
  templateUrl: './template-list.html',
  styleUrl: '../../accounts/account-list/account-list.scss',
})
export class TemplateList {
  private readonly service = inject(QuoteTemplatesService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<QuoteTemplate[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(false);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly canManage = this.auth.hasAnyRole('ADMIN', 'SALES_MANAGER');
  readonly columns = computed(() =>
    this.canManage
      ? ['name', 'appliesTo', 'isDefault', 'createdAt', 'actions']
      : ['name', 'appliesTo', 'isDefault', 'createdAt'],
  );

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => { this.page.set(0); this.load(); });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service
      .list({ page: this.page() + 1, pageSize: this.pageSize(), search: this.searchControl.value })
      .subscribe({
        next: (res) => { this.items.set(res.items); this.total.set(res.meta.total); this.loading.set(false); },
        error: (err) => { this.loading.set(false); this.snack.open(extractApiError(err, 'Failed to load templates'), 'Dismiss', { duration: 5000 }); },
      });
  }

  onPage(e: PageEvent): void { this.page.set(e.pageIndex); this.pageSize.set(e.pageSize); this.load(); }

  openCreate(): void {
    this.dialog.open(TemplateForm, { data: {} }).afterClosed().subscribe((r?: QuoteTemplate) => {
      if (r) { this.snack.open('Template created', undefined, { duration: 2500 }); this.load(); }
    });
  }

  openEdit(template: QuoteTemplate): void {
    this.dialog.open(TemplateForm, { data: { template } }).afterClosed().subscribe((r?: QuoteTemplate) => {
      if (r) { this.snack.open('Template updated', undefined, { duration: 2500 }); this.load(); }
    });
  }

  confirmDelete(template: QuoteTemplate): void {
    this.dialog
      .open(ConfirmDialog, { data: { title: 'Delete template', message: `Delete "${template.name}"?`, confirmLabel: 'Delete', destructive: true } })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.service.remove(template.id).subscribe({
          next: () => { this.snack.open('Template deleted', undefined, { duration: 2500 }); this.load(); },
          error: (err) => this.snack.open(extractApiError(err, 'Could not delete'), 'Dismiss', { duration: 5000 }),
        });
      });
  }
}
