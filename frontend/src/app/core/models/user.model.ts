import type { UserRole } from './auth.model';

export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export const USER_ROLES: UserRole[] = ['ADMIN', 'SALES_MANAGER', 'SALES_REP', 'VIEWER'];
export const USER_STATUSES: UserStatus[] = ['ACTIVE', 'SUSPENDED'];

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function roleLabel(role: string): string {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
