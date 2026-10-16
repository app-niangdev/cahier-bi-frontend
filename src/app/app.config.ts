import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { repositoryProviders } from './core/data/repository.providers';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { authInterceptor } from './core/http/auth.interceptor';
import { PageTitleStrategy } from './core/layout/page-title.strategy';

/**
 * L'authentification passe par l'API Laravel (src/environments : apiUrl).
 * Ordre des intercepteurs : apiErrorInterceptor reçoit les erreurs après la tentative
 * de renouvellement du jeton faite par authInterceptor.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([apiErrorInterceptor, authInterceptor])),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    { provide: LOCALE_ID, useValue: 'fr' },
    repositoryProviders(),
  ],
};
