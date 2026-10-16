import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Cadre commun des écrans d'authentification. */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 to-ink-50">
      <header class="px-4 py-5 sm:px-8">
        <a routerLink="/" class="inline-flex items-center gap-2.5">
          <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white" aria-hidden="true">B</span>
          <span class="text-lg font-bold text-ink-900">Cahier Bi</span>
        </a>
      </header>
      <main class="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center">
        <div class="w-full" [class]="wide() ? 'max-w-4xl' : 'max-w-md'">
          <div class="mb-6 text-center">
            <h1 class="text-2xl font-bold text-ink-900">{{ title() }}</h1>
            @if (subtitle()) {
              <p class="mt-1 text-sm text-ink-600">{{ subtitle() }}</p>
            }
          </div>
          <ng-content />
        </div>
      </main>
    </div>
  `,
})
export class AuthLayoutComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly wide = input(false);
}
