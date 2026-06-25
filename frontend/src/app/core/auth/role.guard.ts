import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import type { UserRole } from '../models/auth.model';

/**
 * Mirrors backend RBAC. Usage:
 *   { path: 'products', canActivate: [authGuard, roleGuard('ADMIN','SALES_MANAGER')] }
 */
export function roleGuard(...allowed: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.currentUser()?.role;
    if (role && allowed.includes(role)) return true;
    return router.createUrlTree(['/dashboard']);
  };
}
