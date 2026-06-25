import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PublicQuoteService } from './public-quote.service';
import { extractApiError } from '../../core/utils/api-error';
import type { PublicQuoteView } from '../../core/models/quote.model';

@Component({
  selector: 'app-quote-public-signing',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatProgressBarModule,
  ],
  templateUrl: './quote-public-signing.html',
  styleUrl: './quote-public-signing.scss',
})
export class QuotePublicSigning {
  private readonly service = inject(PublicQuoteService);
  private readonly route = inject(ActivatedRoute);

  private readonly token = this.route.snapshot.paramMap.get('token')!;
  readonly lineColumns = ['description', 'quantity', 'unitPrice', 'discountPct', 'lineTotal'];

  readonly quote = signal<PublicQuoteView | null>(null);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal<'ACCEPTED' | 'DECLINED' | null>(null);

  signerName = '';
  signerEmail = '';
  readonly hasSignature = signal(false);

  private ctx?: CanvasRenderingContext2D;
  private drawing = false;
  private canvas?: HTMLCanvasElement;

  @ViewChild('pad') set pad(ref: ElementRef<HTMLCanvasElement> | undefined) {
    if (ref && !this.ctx) this.initPad(ref.nativeElement);
  }

  constructor() {
    this.service.get(this.token).subscribe({
      next: (q) => {
        this.quote.set(q);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiError(err, 'This signing link is invalid or has expired.'));
      },
    });
  }

  private initPad(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.width = canvas.clientWidth || 600;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a1a';
    this.ctx = ctx;
  }

  private pos(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  start(e: PointerEvent): void {
    if (!this.ctx) return;
    e.preventDefault();
    this.drawing = true;
    const { x, y } = this.pos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }
  draw(e: PointerEvent): void {
    if (!this.drawing || !this.ctx) return;
    const { x, y } = this.pos(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.hasSignature.set(true);
  }
  stop(): void {
    this.drawing = false;
  }
  clearPad(): void {
    if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasSignature.set(false);
  }

  accept(): void {
    if (!this.signerName.trim() || this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.service
      .sign(this.token, {
        signerName: this.signerName.trim(),
        signerEmail: this.signerEmail.trim() || undefined,
        signatureImage: this.hasSignature() ? this.canvas?.toDataURL('image/png') : undefined,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.done.set('ACCEPTED');
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(extractApiError(err, 'Could not record your signature'));
        },
      });
  }

  decline(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.service.decline(this.token).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set('DECLINED');
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(extractApiError(err, 'Could not decline'));
      },
    });
  }
}
