import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface CommentDialogData {
  title: string;
  confirmLabel: string;
  /** Require a non-empty comment before confirming (e.g. rejection reason). */
  required?: boolean;
  destructive?: boolean;
}

@Component({
  selector: 'app-comment-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ data.required ? 'Comment (required)' : 'Comment (optional)' }}</mat-label>
        <textarea matInput rows="3" [(ngModel)]="comment"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="undefined">Cancel</button>
      <button
        mat-flat-button
        [color]="data.destructive ? 'warn' : 'primary'"
        [disabled]="data.required && !comment().trim()"
        (click)="confirm()"
      >
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full { width: 100%; min-width: 360px; }`],
})
export class CommentDialog {
  readonly data = inject<CommentDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<CommentDialog, { comments?: string }>);
  readonly comment = signal('');

  confirm(): void {
    const c = this.comment().trim();
    this.ref.close({ comments: c || undefined });
  }
}
