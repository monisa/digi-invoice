import { inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiEnvelope, PageMeta } from '../models/api.model';

export type ListParams = Record<string, string | number | undefined>;

export interface ListResult<T> {
  items: T[];
  meta: PageMeta;
}

const EMPTY_META: PageMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

/**
 * Generic tenant-scoped REST resource client. Concrete services set `path`
 * (e.g. '/accounts') and the entity type. Unwraps the { data, meta, errors }
 * envelope; HTTP/auth concerns are handled by the auth interceptor.
 */
export abstract class CrudService<T, C = Partial<T>, U = Partial<T>> {
  protected readonly http = inject(HttpClient);
  protected readonly base = environment.apiBaseUrl;
  protected abstract readonly path: string;

  list(params: ListParams = {}): Observable<ListResult<T>> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') httpParams = httpParams.set(key, String(value));
    }
    return this.http
      .get<ApiEnvelope<T[]>>(`${this.base}${this.path}`, { params: httpParams })
      .pipe(map((env) => ({ items: env.data ?? [], meta: env.meta ?? EMPTY_META })));
  }

  get(id: string): Observable<T> {
    return this.http.get<ApiEnvelope<T>>(`${this.base}${this.path}/${id}`).pipe(map(unwrap));
  }

  create(body: C): Observable<T> {
    return this.http.post<ApiEnvelope<T>>(`${this.base}${this.path}`, body).pipe(map(unwrap));
  }

  update(id: string, body: U): Observable<T> {
    return this.http.put<ApiEnvelope<T>>(`${this.base}${this.path}/${id}`, body).pipe(map(unwrap));
  }

  remove(id: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<unknown>>(`${this.base}${this.path}/${id}`)
      .pipe(map(() => undefined));
  }
}

function unwrap<T>(env: ApiEnvelope<T>): T {
  if (env.data === null) throw new Error('Empty response payload');
  return env.data;
}
