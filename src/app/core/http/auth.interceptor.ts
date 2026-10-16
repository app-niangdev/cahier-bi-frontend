import { HttpBackend, HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { TokenStorage } from '../auth/token-storage';
import { API_URL, ApiEnvelope } from './api';

/** Routes d'authentification : jamais de renouvellement automatique sur un 401. */
const AUTH_ROUTES = /\/auth\/(login|refresh|register|otp|password|forgot-password|reset-password)/;

let refreshing$: Observable<string> | null = null;

/**
 * Ajoute le jeton JWT aux requêtes de l'API. Sur un 401 (jeton d'accès expiré),
 * renouvelle une fois la session avec le jeton de rafraîchissement puis rejoue la requête.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(API_URL);
  if (!req.url.startsWith(apiUrl)) return next(req);

  const tokens = inject(TokenStorage);
  // Client sans intercepteurs : l'appel de renouvellement ne repasse pas ici
  const raw = new HttpClient(inject(HttpBackend));

  return next(withToken(req, tokens.token())).pipe(
    catchError((error: unknown) => {
      const refreshToken = tokens.refreshToken();
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !refreshToken || AUTH_ROUTES.test(req.url)) {
        return throwError(() => error);
      }
      refreshing$ ??= raw
        .post<ApiEnvelope<{ access_token: string; refresh_token: string }>>(`${apiUrl}/auth/refresh`, null, {
          headers: { Authorization: `Bearer ${refreshToken}`, Accept: 'application/json' },
        })
        .pipe(
          map(({ payload }) => {
            tokens.set(payload.access_token, payload.refresh_token);
            return payload.access_token;
          }),
          catchError(() => {
            tokens.clear();
            return throwError(() => error);
          }),
          finalize(() => (refreshing$ = null)),
          shareReplay(1),
        );
      return refreshing$.pipe(switchMap((token) => next(withToken(req, token))));
    }),
  );
};

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return req.clone({ setHeaders: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' } });
}
