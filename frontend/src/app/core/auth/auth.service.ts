import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiEnvelope } from '../models/api.model';
import type {
  AuthResult,
  AuthTenant,
  AuthTokens,
  AuthUser,
  LoginRequest,
  SignupRequest,
} from '../models/auth.model';

const ACCESS_KEY = 'di_access';
const REFRESH_KEY = 'di_refresh';
const USER_KEY = 'di_user';
const TENANT_KEY = 'di_tenant';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.apiBaseUrl;

  private readonly _accessToken = signal<string | null>(localStorage.getItem(ACCESS_KEY));
  private readonly _user = signal<AuthUser | null>(readJson<AuthUser>(USER_KEY));
  private readonly _tenant = signal<AuthTenant | null>(readJson<AuthTenant>(TENANT_KEY));

  /** In-flight refresh, shared so concurrent 401s trigger only one call. */
  private refresh$: Observable<string> | null = null;

  readonly currentUser = this._user.asReadonly();
  readonly currentTenant = this._tenant.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken());

  get accessToken(): string | null {
    return this._accessToken();
  }

  login(req: LoginRequest): Observable<AuthResult> {
    return this.http
      .post<ApiEnvelope<AuthResult>>(`${this.base}/auth/login`, req)
      .pipe(map(unwrap), tap((res) => this.setSession(res)));
  }

  signup(req: SignupRequest): Observable<AuthResult> {
    return this.http
      .post<ApiEnvelope<AuthResult>>(`${this.base}/auth/signup`, req)
      .pipe(map(unwrap), tap((res) => this.setSession(res)));
  }

  logout(): void {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      // Best-effort server-side revocation; clear locally regardless.
      this.http.post(`${this.base}/auth/logout`, { refreshToken }).subscribe({ error: () => undefined });
    }
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  /** Used by the interceptor on 401. Single-flight via shareReplay. */
  refreshAccessToken(): Observable<string> {
    if (this.refresh$) return this.refresh$;

    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    this.refresh$ = this.http
      .post<ApiEnvelope<AuthTokens>>(`${this.base}/auth/refresh`, { refreshToken })
      .pipe(
        map(unwrap),
        tap((tokens) => this.storeTokens(tokens)),
        map((tokens) => tokens.accessToken),
        finalize(() => (this.refresh$ = null)),
        shareReplay(1),
      );
    return this.refresh$;
  }

  private setSession(res: AuthResult): void {
    this.storeTokens(res);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    localStorage.setItem(TENANT_KEY, JSON.stringify(res.tenant));
    this._user.set(res.user);
    this._tenant.set(res.tenant);
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    this._accessToken.set(tokens.accessToken);
  }

  private clearSession(): void {
    [ACCESS_KEY, REFRESH_KEY, USER_KEY, TENANT_KEY].forEach((k) => localStorage.removeItem(k));
    this._accessToken.set(null);
    this._user.set(null);
    this._tenant.set(null);
  }
}

function unwrap<T>(env: ApiEnvelope<T>): T {
  if (env.data === null) throw new Error('Empty response payload');
  return env.data;
}

function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
