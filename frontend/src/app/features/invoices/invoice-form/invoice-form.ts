import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InvoicesService } from '../invoices.service';
import { AccountsService } from '../../accounts/accounts.service';
import { ContactsService } from '../../contacts/contacts.service';
import { ProductsService } from '../../products/products.service';
import { TaxRatesService } from '../../tax-rates/tax-rates.service';
import { QuoteTemplatesService } from '../../quote-templates/quote-templates.service';
import { extractApiError } from '../../../core/utils/api-error';
import { calculateTotals, type CalcTotals } from '../../../core/utils/money-calc';
import { INVOICE_EDITABLE_STATUSES, type InvoicePayload } from '../../../core/models/invoice.model';
import type { Account, Contact } from '../../../core/models/crm.model';
import type { Product, TaxRate } from '../../../core/models/catalog.model';
import type { QuoteTemplate } from '../../../core/models/quote-template.model';

const EMPTY_TOTALS: CalcTotals = {
  lineTotals: [],
  subtotal: '0.00',
  discountTotal: '0.00',
  taxTotal: '0.00',
  grandTotal: '0.00',
};

@Component({
  selector: 'app-invoice-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './invoice-form.html',
  styleUrl: '../../quotes/quote-builder/quote-builder.scss',
})
export class InvoiceForm {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(InvoicesService);
  private readonly accountsService = inject(AccountsService);
  private readonly contactsService = inject(ContactsService);
  private readonly productsService = inject(ProductsService);
  private readonly taxRatesService = inject(TaxRatesService);
  private readonly templatesService = inject(QuoteTemplatesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly invoiceId = this.route.snapshot.paramMap.get('id');
  readonly isEdit = !!this.invoiceId;

  readonly accounts = signal<Account[]>([]);
  readonly contacts = signal<Contact[]>([]);
  readonly products = signal<Product[]>([]);
  readonly taxRates = signal<TaxRate[]>([]);
  readonly templates = signal<QuoteTemplate[]>([]);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly totals = signal<CalcTotals>(EMPTY_TOTALS);

  readonly lineColumns = ['product', 'description', 'quantity', 'unitPrice', 'discountPct', 'taxRate', 'lineTotal', 'remove'];

  readonly header = this.fb.nonNullable.group({
    accountId: [''],
    contactId: [''],
    templateId: [''],
    currency: ['USD', Validators.required],
    exchangeRate: ['1', [Validators.required, Validators.min(0.000001)]],
    dueDate: [''],
    overallDiscountType: ['PERCENT' as 'PERCENT' | 'AMOUNT'],
    overallDiscountValue: ['0', Validators.min(0)],
  });

  readonly lineItems = this.fb.array<ReturnType<InvoiceForm['makeLine']>>([]);

  readonly form = this.fb.group({ header: this.header, lineItems: this.lineItems });

  constructor() {
    this.loadLookups();

    this.form.valueChanges.pipe(startWith(null), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.recalculate();
    });

    if (this.isEdit) {
      this.loadInvoice(this.invoiceId!);
    } else {
      this.addLine();
    }
  }

  private makeLine() {
    return this.fb.nonNullable.group({
      productId: [''],
      description: [''],
      quantity: ['1', [Validators.required, Validators.min(0.000001)]],
      unitPrice: ['0', [Validators.required, Validators.min(0)]],
      discountPct: ['0', [Validators.min(0), Validators.max(100)]],
      taxRateId: [''],
    });
  }

  addLine(): void {
    this.lineItems.push(this.makeLine());
  }

  removeLine(index: number): void {
    this.lineItems.removeAt(index);
  }

  onProductSelected(index: number, productId: string): void {
    const product = this.products().find((p) => p.id === productId);
    if (!product) return;
    const group = this.lineItems.at(index);
    group.patchValue({
      unitPrice: product.unitPrice,
      taxRateId: product.taxRateId ?? '',
      description: group.controls.description.value || product.name,
    });
  }

  private taxPctFor(taxRateId: string | null | undefined): string {
    if (!taxRateId) return '0';
    return this.taxRates().find((t) => t.id === taxRateId)?.percentage ?? '0';
  }

  private recalculate(): void {
    const lines = this.lineItems.controls.map((g) => {
      const v = g.getRawValue();
      return {
        quantity: v.quantity || 0,
        unitPrice: v.unitPrice || 0,
        discountPct: v.discountPct || 0,
        taxPct: this.taxPctFor(v.taxRateId),
      };
    });
    const h = this.header.getRawValue();
    this.totals.set(calculateTotals(lines, h.overallDiscountType, h.overallDiscountValue || 0));
  }

  private loadLookups(): void {
    this.accountsService.list({ pageSize: 100 }).subscribe((r) => this.accounts.set(r.items));
    this.contactsService.list({ pageSize: 100 }).subscribe((r) => this.contacts.set(r.items));
    this.productsService.list({ pageSize: 100 }).subscribe((r) => this.products.set(r.items));
    this.taxRatesService.list({ pageSize: 100 }).subscribe((r) => this.taxRates.set(r.items));
    this.templatesService
      .list({ pageSize: 100 })
      .subscribe((r) => this.templates.set(r.items.filter((t) => t.appliesTo === 'INVOICE' || t.appliesTo === 'BOTH')));
  }

  private loadInvoice(id: string): void {
    this.loading.set(true);
    this.service.get(id).subscribe({
      next: (invoice) => {
        this.loading.set(false);
        if (!INVOICE_EDITABLE_STATUSES.includes(invoice.status)) {
          this.snack.open(`A ${invoice.status} invoice can't be edited`, 'Dismiss', { duration: 5000 });
          void this.router.navigate(['/invoices', id]);
          return;
        }
        this.header.patchValue({
          accountId: invoice.accountId ?? '',
          contactId: invoice.contactId ?? '',
          templateId: invoice.templateId ?? '',
          currency: invoice.currency,
          exchangeRate: invoice.exchangeRate,
          dueDate: invoice.dueDate?.slice(0, 10) ?? '',
          overallDiscountType: invoice.overallDiscountType,
          overallDiscountValue: invoice.overallDiscountValue,
        });
        this.lineItems.clear();
        for (const li of invoice.lineItems ?? []) {
          const g = this.makeLine();
          g.patchValue({
            productId: li.productId ?? '',
            description: li.description ?? '',
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            discountPct: li.discountPct,
            taxRateId: li.taxRateId ?? '',
          });
          this.lineItems.push(g);
        }
        if (this.lineItems.length === 0) this.addLine();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(extractApiError(err, 'Could not load invoice'));
      },
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const h = this.header.getRawValue();
    const payload: InvoicePayload = {
      accountId: h.accountId || null,
      contactId: h.contactId || null,
      templateId: h.templateId || null,
      currency: h.currency,
      exchangeRate: h.exchangeRate,
      dueDate: h.dueDate || null,
      overallDiscountType: h.overallDiscountType,
      overallDiscountValue: h.overallDiscountValue || '0',
      lineItems: this.lineItems.controls.map((g) => {
        const v = g.getRawValue();
        return {
          productId: v.productId || null,
          description: v.description || null,
          quantity: v.quantity,
          unitPrice: v.unitPrice,
          discountPct: v.discountPct || '0',
          taxRateId: v.taxRateId || null,
        };
      }),
    };

    const req$ = this.isEdit
      ? this.service.update(this.invoiceId!, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: (invoice) => {
        this.snack.open(this.isEdit ? 'Invoice updated' : 'Invoice created', undefined, { duration: 2500 });
        void this.router.navigate(['/invoices', invoice.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(extractApiError(err, 'Could not save invoice'));
      },
    });
  }
}
