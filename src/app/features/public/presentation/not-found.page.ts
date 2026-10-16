import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p class="text-5xl font-bold text-brand-600">404</p>
      <h1 class="mt-3 text-2xl font-bold text-ink-900">Page introuvable</h1>
      <p class="mt-2 text-ink-600">Cette page n'existe pas ou a été déplacée.</p>
      <a [routerLink]="auth.isAuthenticated() ? auth.homeUrl() : '/'" class="btn btn-primary mt-6">Retour à l'accueil</a>
    </main>
  `,
})
export class NotFoundPage {
  protected readonly auth = inject(AuthStore);
}
