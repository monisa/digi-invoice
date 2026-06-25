import { HttpErrorResponse } from '@angular/common/http';
import type { ApiEnvelope } from '../models/api.model';

/** Extract a human-readable message from a backend error envelope. */
export function extractApiError(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as ApiEnvelope<unknown> | null;
    const first = body?.errors?.[0]?.message;
    if (first) return first;
    if (err.status === 0) return 'Cannot reach the server. Is the API running?';
  }
  return fallback;
}
