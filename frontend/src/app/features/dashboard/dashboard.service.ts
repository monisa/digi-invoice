import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiEnvelope } from '../../core/models/api.model';
import type { DashboardSummary } from '../../core/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  summary(): Observable<DashboardSummary> {
    return this.http
      .get<ApiEnvelope<DashboardSummary>>(`${this.base}/dashboard/summary`)
      .pipe(map((e) => e.data!));
  }
}
