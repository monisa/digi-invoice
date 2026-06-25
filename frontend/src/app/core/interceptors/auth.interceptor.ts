import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

// Auth endpoints must never carry a (possibly stale) bearer token, and a 401
// from them should NOT trigger a refresh loop.
const AUTH_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout'];

function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiBaseUrl) || url.startsWith('/api/');
}

function isAuthPath(url: string): boolean {
  return AUTH_PATHS.some((p) => url.includes(p));
}

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Attaches the JWT access token to API requests and, on a 401, transparently
 * refreshes the token once and retries the original request. A refresh failure
 * logs the user out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (!isApiRequest(req.url) || isAuthPath(req.url)) {
    return next(req);
  }

  const token = auth.accessToken;
  const authed = token ? withToken(req, token) : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || !auth.accessToken) {
        return throwError(() => err);
      }
      return refreshAndRetry(auth, req, next);
    }),
  );
};

function refreshAndRetry(auth: AuthService, req: HttpRequest<unknown>, next: HttpHandlerFn) {
  return auth.refreshAccessToken().pipe(
    switchMap((newToken) => next(withToken(req, newToken))),
    catchError((refreshErr) => {
      auth.logout();
      return throwError(() => refreshErr);
    }),
  );
}
