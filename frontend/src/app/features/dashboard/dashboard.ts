import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly auth = inject(AuthService);
  readonly user = this.auth.currentUser;
  readonly tenant = this.auth.currentTenant;

  // Placeholder metrics — wired to the reports API in a later slice.
  readonly stats = [
    { label: 'Open quotes', value: '—', icon: 'description' },
    { label: 'Pipeline value', value: '—', icon: 'trending_up' },
    { label: 'Win rate', value: '—', icon: 'emoji_events' },
    { label: 'Expiring soon', value: '—', icon: 'schedule' },
  ];
}
