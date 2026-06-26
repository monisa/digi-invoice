import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

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
    // Public, unauthenticated client signing page (no shell, no guard).
    path: 'sign/:token',
    loadComponent: () =>
      import('./features/quote-public-signing/quote-public-signing').then(
        (m) => m.QuotePublicSigning,
      ),
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
        path: 'exchange-rates',
        loadComponent: () =>
          import('./features/exchange-rates/exchange-rate-list/exchange-rate-list').then(
            (m) => m.ExchangeRateList,
          ),
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
      {
        path: 'sales-orders',
        loadComponent: () =>
          import('./features/sales-orders/sales-order-list/sales-order-list').then(
            (m) => m.SalesOrderList,
          ),
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('./features/invoices/invoice-list/invoice-list').then((m) => m.InvoiceList),
      },
      {
        path: 'quote-templates',
        loadComponent: () =>
          import('./features/quote-templates/template-list/template-list').then((m) => m.TemplateList),
      },
      {
        path: 'users',
        canActivate: [roleGuard('ADMIN', 'SALES_MANAGER')],
        loadComponent: () => import('./features/users/user-list/user-list').then((m) => m.UserList),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
