import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { UsersService } from '../users.service';
import { extractApiError } from '../../../core/utils/api-error';
import { USER_ROLES, USER_STATUSES, roleLabel, type ManagedUser } from '../../../core/models/user.model';
import type { UserRole } from '../../../core/models/auth.model';

@Component({
  selector: 'app-user-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './user-form.html',
  styleUrl: '../../accounts/account-form/account-form.scss',
})
export class UserForm {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(UsersService);
  private readonly ref = inject(MatDialogRef<UserForm, ManagedUser>);
  readonly data = inject<{ user?: ManagedUser }>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.user;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly roles = USER_ROLES;
  readonly statuses = USER_STATUSES;
  readonly roleLabel = roleLabel;

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.user?.name ?? '', Validators.required],
    email: [this.data?.user?.email ?? '', [Validators.required, Validators.email]],
    role: [this.data?.user?.role ?? ('SALES_REP' as UserRole)],
    status: [this.data?.user?.status ?? 'ACTIVE'],
    // Required on create; optional (reset) on edit.
    password: ['', this.data?.user ? [] : [Validators.required, Validators.minLength(8)]],
  });

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();

    const req$ = this.isEdit
      ? this.service.update(this.data.user!.id, {
          name: v.name,
          role: v.role,
          status: v.status,
          ...(v.password ? { password: v.password } : {}),
        })
      : this.service.create({ name: v.name, email: v.email, password: v.password, role: v.role });

    req$.subscribe({
      next: (user) => this.ref.close(user),
      error: (err) => {
        this.saving.set(false);
        this.error.set(extractApiError(err, 'Could not save user'));
      },
    });
  }
}
