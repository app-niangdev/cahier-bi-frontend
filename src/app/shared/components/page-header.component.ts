import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';

/** Titre de page + lien retour + emplacement pour les actions (ng-content). */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        @if (backLink()) {
          <a [routerLink]="backLink()" class="mb-2 inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900">
            <app-icon name="chevron-left" [size]="16" />
            {{ backLabel() }}
          </a>
        }
        <h1 class="truncate text-2xl font-bold tracking-tight text-ink-900">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-sm text-ink-600">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly backLink = input<string | unknown[] | null>(null);
  readonly backLabel = input('Retour');
}
