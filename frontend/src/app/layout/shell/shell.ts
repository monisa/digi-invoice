import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  /** Implemented in a later slice — shown disabled until then. */
  enabled: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.currentUser;
  readonly tenant = this.auth.currentTenant;

  readonly nav: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', enabled: true },
    { label: 'Accounts', icon: 'business', route: '/accounts', enabled: false },
    { label: 'Contacts', icon: 'contacts', route: '/contacts', enabled: false },
    { label: 'Deals', icon: 'monetization_on', route: '/deals', enabled: false },
    { label: 'Products', icon: 'inventory_2', route: '/products', enabled: false },
    { label: 'Quotes', icon: 'description', route: '/quotes', enabled: false },
  ];

  logout(): void {
    this.auth.logout();
  }
}
