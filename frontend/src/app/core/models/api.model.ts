// Mirrors the backend response envelope: { data, meta, errors }.

export interface ApiErrorItem {
  code: string;
  message: string;
  field?: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  data: T | null;
  meta: PageMeta | null;
  errors: ApiErrorItem[] | null;
}
