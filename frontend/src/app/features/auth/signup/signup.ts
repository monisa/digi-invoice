import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/utils/api-error';

@Component({
  selector: 'app-signup',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
  ],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly logoPreview = signal<string | null>(null);
  readonly logoError = signal<string | null>(null);

  private static readonly MAX_LOGO_BYTES = 2 * 1024 * 1024;

  readonly form = this.fb.nonNullable.group({
    companyName: ['', Validators.required],
    subdomain: [
      '',
      [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/)],
    ],
    adminName: ['', Validators.required],
    adminEmail: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    logo: ['', Validators.required],
  });

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.logoError.set(null);

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.logoError.set('Logo must be a PNG or JPEG image');
      return;
    }
    if (file.size > Signup.MAX_LOGO_BYTES) {
      this.logoError.set('Logo must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.form.controls.logo.setValue(dataUrl);
      this.logoPreview.set(dataUrl);
    };
    reader.onerror = () => this.logoError.set('Could not read that file');
    reader.readAsDataURL(file);
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.signup(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiError(err, 'Could not create account'));
      },
    });
  }
}
