import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { UserRole } from '../../core/models/auth.model';
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
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.currentUser;
  readonly tenant = this.auth.currentTenant;

  private readonly allNav: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', enabled: true },
    { label: 'Accounts', icon: 'business', route: '/accounts', enabled: true },
    { label: 'Contacts', icon: 'contacts', route: '/contacts', enabled: true },
    { label: 'Deals', icon: 'monetization_on', route: '/deals', enabled: true },
    { label: 'Products', icon: 'inventory_2', route: '/products', enabled: true },
    { label: 'Tax rates', icon: 'percent', route: '/tax-rates', enabled: true },
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
