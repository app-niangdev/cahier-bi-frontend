import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { IconComponent } from '../icon.component';
import { ConfirmService } from './confirm.service';

/** Instance unique (dans App) qui affiche les demandes de ConfirmService. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-0 shadow-xl"
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      (close)="confirm.answer(false)"
    >
      @if (confirm.request(); as req) {
        <div class="flex gap-4 p-5">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            [class]="req.danger ? 'bg-danger-100 text-danger-700' : 'bg-info-100 text-info-700'"
          >
            <app-icon [name]="req.danger ? 'alert' : 'info'" />
          </div>
          <div>
            <h2 id="confirm-title" class="text-lg font-semibold text-ink-900">{{ req.title }}</h2>
            <p id="confirm-message" class="mt-1 text-sm text-ink-600">{{ req.message }}</p>
          </div>
        </div>
        <div class="flex flex-col-reverse gap-2 border-t border-ink-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" class="btn btn-secondary" (click)="confirm.answer(false)">{{ req.cancelLabel ?? 'Annuler' }}</button>
          <button type="button" class="btn" [class]="req.danger ? 'btn-danger' : 'btn-primary'" (click)="confirm.answer(true)">
            {{ req.confirmLabel ?? 'Confirmer' }}
          </button>
        </div>
      }
    </dialog>
  `,
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      const open = this.confirm.request() !== null;
      if (open && !el.open) el.showModal();
      if (!open && el.open) el.close();
    });
  }
}
