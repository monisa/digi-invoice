import { Component, computed, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { UserRole } from '../../core/models/auth.model';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  enabled: boolean;
  /** If set, only visible to users with one of these roles. */
  roles?: UserRole[];
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
    MatTooltipModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  readonly theme = inject(ThemeService);

  readonly user = this.auth.currentUser;
  readonly tenant = this.auth.currentTenant;

  constructor() {
    effect(() => {
      const logo = this.tenant()?.logoDataUri;
      if (!logo) return;
      const link = this.document.getElementById('app-favicon') as HTMLLinkElement | null;
      if (link) link.href = logo;
    });
  }

  private readonly allNav: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', enabled: true },
    { label: 'Accounts', icon: 'business', route: '/accounts', enabled: true },
    { label: 'Contacts', icon: 'contacts', route: '/contacts', enabled: true },
    { label: 'Products', icon: 'inventory_2', route: '/products', enabled: true },
    { label: 'Tax rates', icon: 'percent', route: '/tax-rates', enabled: true },
    { label: 'Exchange rates', icon: 'currency_exchange', route: '/exchange-rates', enabled: true },
    { label: 'Quotes', icon: 'description', route: '/quotes', enabled: true },
    { label: 'Templates', icon: 'article', route: '/quote-templates', enabled: true },
    { label: 'Sales orders', icon: 'shopping_cart', route: '/sales-orders', enabled: true },
    { label: 'Invoices', icon: 'receipt_long', route: '/invoices', enabled: true },
    { label: 'Users', icon: 'group', route: '/users', enabled: true, roles: ['ADMIN', 'SALES_MANAGER'] },
  ];

  readonly nav = computed(() =>
    this.allNav.filter((item) => !item.roles || this.auth.hasAnyRole(...item.roles)),
  );

  logout(): void {
    this.auth.logout();
  }
}
