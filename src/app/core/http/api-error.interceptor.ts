import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { TokenStorage } from '../auth/token-storage';
import { ApiError } from '../data/api-error';

/** Corps d'erreur Laravel (ApiResponse::error, ApiException). */
interface LaravelErrorBody {
  message?: string;
  error_code?: string;
  errors?: Record<string, string[]>;
  payload?: Record<string, unknown> | null;
}

/** Routes où un 401 signifie « identifiants incorrects », pas « session expirée ». */
const AUTH_ROUTES = /\/auth\/(login|refresh|register|otp|password|forgot-password|reset-password)/;

/**
 * Convertit les erreurs HTTP Laravel en ApiError (même format que la simulation)
 * et gère les cas globaux : session expirée → connexion, abonnement expiré → page dédiée.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokens = inject(TokenStorage);
  // Résolu à la demande : AuthStore dépend lui-même de HttpClient
  const injector = inject(Injector);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      const body = (error.error && typeof error.error === 'object' ? error.error : {}) as LaravelErrorBody;
      const code = body.error_code ?? `HTTP_${error.status}`;

      // Jeton expiré et non renouvelable (voir authInterceptor) : retour à la connexion
      if (error.status === 401 && !AUTH_ROUTES.test(req.url) && !req.url.endsWith('/auth/me')) {
        injector.get(AuthStore).expire();
        void router.navigateByUrl('/connexion');
      }
      if (code === 'SUBSCRIPTION_EXPIRED' && tokens.token()) {
        void router.navigateByUrl('/abonnement-expire');
      }
      return throwError(
        () =>
          new ApiError(
            error.status === 0
              ? 'Impossible de joindre le serveur. Vérifiez votre connexion.'
              : (body.message ?? 'Une erreur est survenue. Veuillez réessayer.'),
            code,
            error.status,
            body.payload ?? {},
          ),
      );
    }),
  );
};
