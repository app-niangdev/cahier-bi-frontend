import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

/** Erreur de chargement avec bouton « Réessayer ». */
@Component({
  selector: 'app-error-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card flex flex-col items-center px-4 py-10 text-center" role="alert">
      <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-100 text-danger-700">
        <app-icon name="alert" [size]="26" />
      </div>
      <h2 class="text-base font-semibold text-ink-800">{{ title() }}</h2>
      <p class="mt-1 max-w-md text-sm text-ink-600">{{ message() }}</p>
      <button type="button" class="btn btn-primary mt-4" (click)="retry.emit()">
        <app-icon name="refresh" [size]="16" />
        Réessayer
      </button>
    </div>
  `,
})
export class ErrorStateComponent {
  readonly title = input('Impossible de charger les données');
  readonly message = input<string | null>('Une erreur est survenue.');
  readonly retry = output<void>();
}
