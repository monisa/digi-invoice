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
import { UsersService } from '../users.service';
import { UserForm } from '../user-form/user-form';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/utils/api-error';
import { roleLabel, type ManagedUser } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-list',
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
  templateUrl: './user-list.html',
  styleUrl: '../../accounts/account-list/account-list.scss',
})
export class UserList {
  private readonly service = inject(UsersService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<ManagedUser[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal(20);
  readonly loading = signal(false);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly canManage = this.auth.hasAnyRole('ADMIN');
  readonly currentUserId = this.auth.currentUser()?.id;
  readonly roleLabel = roleLabel;
  readonly columns = computed(() =>
    this.canManage
      ? ['name', 'email', 'role', 'status', 'lastLoginAt', 'actions']
      : ['name', 'email', 'role', 'status', 'lastLoginAt'],
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
        error: (err) => { this.loading.set(false); this.snack.open(extractApiError(err, 'Failed to load users'), 'Dismiss', { duration: 5000 }); },
      });
  }

  onPage(e: PageEvent): void { this.page.set(e.pageIndex); this.pageSize.set(e.pageSize); this.load(); }

  openCreate(): void {
    this.dialog.open(UserForm, { data: {} }).afterClosed().subscribe((r?: ManagedUser) => {
      if (r) { this.snack.open('User created', undefined, { duration: 2500 }); this.load(); }
    });
  }

  openEdit(user: ManagedUser): void {
    this.dialog.open(UserForm, { data: { user } }).afterClosed().subscribe((r?: ManagedUser) => {
      if (r) { this.snack.open('User updated', undefined, { duration: 2500 }); this.load(); }
    });
  }

  confirmDelete(user: ManagedUser): void {
    this.dialog
      .open(ConfirmDialog, {
        data: { title: 'Deactivate user', message: `Deactivate ${user.name}? They will be signed out and unable to log in.`, confirmLabel: 'Deactivate', destructive: true },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.service.remove(user.id).subscribe({
          next: () => { this.snack.open('User deactivated', undefined, { duration: 2500 }); this.load(); },
          error: (err) => this.snack.open(extractApiError(err, 'Could not deactivate'), 'Dismiss', { duration: 5000 }),
        });
      });
  }
}
