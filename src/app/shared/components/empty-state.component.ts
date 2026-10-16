import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

/** Liste vide : icône, titre, message et actions (ng-content). */
@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-ink-500">
        <app-icon [name]="icon()" [size]="26" />
      </div>
      <h2 class="text-base font-semibold text-ink-800">{{ title() }}</h2>
      @if (message()) {
        <p class="mt-1 max-w-sm text-sm text-ink-600">{{ message() }}</p>
      }
      <div class="mt-4 flex flex-wrap justify-center gap-2"><ng-content /></div>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string | null>(null);
  readonly icon = input<IconName>('book');
}
