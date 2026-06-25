import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { QuoteTemplatesService } from '../quote-templates.service';
import { extractApiError } from '../../../core/utils/api-error';
import { TEMPLATE_PLACEHOLDERS, type QuoteTemplate } from '../../../core/models/quote-template.model';

@Component({
  selector: 'app-template-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatProgressBarModule,
  ],
  templateUrl: './template-form.html',
  styleUrl: './template-form.scss',
})
export class TemplateForm {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(QuoteTemplatesService);
  private readonly ref = inject(MatDialogRef<TemplateForm, QuoteTemplate>);
  readonly data = inject<{ template?: QuoteTemplate }>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.template;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly placeholders = TEMPLATE_PLACEHOLDERS.map((p) => `{{${p}}}`);

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.template?.name ?? '', Validators.required],
    headerHtml: [this.data?.template?.headerHtml ?? ''],
    termsHtml: [this.data?.template?.termsHtml ?? ''],
    footerHtml: [this.data?.template?.footerHtml ?? ''],
    isDefault: [this.data?.template?.isDefault ?? false],
  });

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    const payload = {
      name: v.name,
      headerHtml: v.headerHtml || null,
      termsHtml: v.termsHtml || null,
      footerHtml: v.footerHtml || null,
      isDefault: v.isDefault,
    };

    const req$ = this.isEdit
      ? this.service.update(this.data.template!.id, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: (tpl) => this.ref.close(tpl),
      error: (err) => {
        this.saving.set(false);
        this.error.set(extractApiError(err, 'Could not save template'));
      },
    });
  }
}
