import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/auth/auth.service';
import { DashboardService } from './dashboard.service';
import { extractApiError } from '../../core/utils/api-error';
import type { DashboardSummary } from '../../core/models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatTableModule, MatProgressBarModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly auth = inject(AuthService);
  private readonly service = inject(DashboardService);

  readonly user = this.auth.currentUser;
  readonly tenant = this.auth.currentTenant;

  readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly repColumns = ['name', 'totalQuotes', 'acceptedQuotes', 'totalValue'];

  readonly stats = computed(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      { label: 'Open quotes', value: String(s.quotes.open), icon: 'description' },
      { label: 'Invoiced amount', value: s.invoicedValue, icon: 'receipt_long' },
      { label: 'Win rate', value: `${s.winRate}%`, icon: 'emoji_events' },
      { label: 'Expiring in 7 days', value: String(s.expiringSoon), icon: 'schedule' },
    ];
  });

  constructor() {
    this.service.summary().subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiError(err, 'Could not load dashboard'));
      },
    });
  }
}
