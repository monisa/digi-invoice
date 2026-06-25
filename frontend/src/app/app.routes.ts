import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/signup/signup').then((m) => m.Signup),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'accounts',
        loadComponent: () =>
          import('./features/accounts/account-list/account-list').then((m) => m.AccountList),
      },
      {
        path: 'contacts',
        loadComponent: () =>
          import('./features/contacts/contact-list/contact-list').then((m) => m.ContactList),
      },
      {
        path: 'deals',
        loadComponent: () => import('./features/deals/deal-list/deal-list').then((m) => m.DealList),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
