import { Injectable } from '@angular/core';
import { CrudService } from '../../core/api/crud.service';
import type { Product } from '../../core/models/catalog.model';

export type ProductPayload = {
  name?: string;
  sku?: string | null;
  unitPrice?: string;
  currency?: string;
  taxRateId?: string | null;
  description?: string | null;
};

@Injectable({ providedIn: 'root' })
export class ProductsService extends CrudService<Product, ProductPayload, ProductPayload> {
  protected readonly path = '/products';
}
