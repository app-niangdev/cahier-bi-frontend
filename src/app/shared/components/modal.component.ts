import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { IconComponent } from './icon.component';

let nextId = 0;

/**
 * Fenêtre modale basée sur <dialog> : piège du focus, touche Échap
 * et retour du focus à l'élément d'origine gérés par le navigateur.
 */
@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="m-auto w-[calc(100%-2rem)] rounded-xl bg-white p-0 text-ink-900 shadow-xl {{ widthClass() }}"
      [attr.aria-labelledby]="titleId"
      (close)="closed.emit()"
    >
      @if (open()) {
        <div class="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
          <div>
            <h2 [id]="titleId" class="text-lg font-semibold">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="mt-0.5 text-sm text-ink-600">{{ subtitle() }}</p>
            }
          </div>
          <button type="button" class="btn-ghost -mr-2 rounded-lg p-2" (click)="dialog.close()" aria-label="Fermer">
            <app-icon name="x" />
          </button>
        </div>
        <div class="max-h-[70vh] overflow-y-auto px-5 py-4">
          <ng-content />
        </div>
      }
    </dialog>
  `,
})
export class ModalComponent {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly size = input<'md' | 'lg'>('md');
  /** Émis à la fermeture (Échap, bouton ×, ou fermeture demandée par le parent). */
  readonly closed = output<void>();

  protected readonly titleId = `modal-title-${++nextId}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected widthClass(): string {
    return this.size() === 'lg' ? 'max-w-2xl' : 'max-w-lg';
  }

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open() && !el.open) el.showModal();
      if (!this.open() && el.open) el.close();
    });
  }
}
