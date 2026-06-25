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
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/product-list/product-list').then((m) => m.ProductList),
      },
      {
        path: 'tax-rates',
        loadComponent: () =>
          import('./features/tax-rates/tax-rate-list/tax-rate-list').then((m) => m.TaxRateList),
      },
      {
        path: 'quotes',
        loadComponent: () =>
          import('./features/quotes/quote-list/quote-list').then((m) => m.QuoteList),
      },
      {
        path: 'quotes/new',
        loadComponent: () =>
          import('./features/quotes/quote-builder/quote-builder').then((m) => m.QuoteBuilder),
      },
      {
        path: 'quotes/:id',
        loadComponent: () =>
          import('./features/quotes/quote-detail/quote-detail').then((m) => m.QuoteDetail),
      },
      {
        path: 'quotes/:id/edit',
        loadComponent: () =>
          import('./features/quotes/quote-builder/quote-builder').then((m) => m.QuoteBuilder),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
