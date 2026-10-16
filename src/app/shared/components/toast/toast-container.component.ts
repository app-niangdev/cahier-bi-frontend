import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../icon.component';
import { ToastService, ToastType } from './toast.service';

const STYLES: Record<ToastType, string> = {
  success: 'border-ok-600 bg-ok-50 text-ok-700',
  error: 'border-danger-600 bg-danger-50 text-danger-700',
  info: 'border-info-600 bg-info-50 text-info-700',
};

@Component({
  selector: 'app-toast-container',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      aria-live="polite"
      aria-atomic="false"
    >
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="toast-in pointer-events-auto flex w-full items-start gap-3 rounded-lg border-l-4 px-4 py-3 shadow-lg {{ styles[toast.type] }}"
          [attr.role]="toast.type === 'error' ? 'alert' : 'status'"
        >
          <app-icon [name]="toast.type === 'error' ? 'alert' : toast.type === 'success' ? 'check' : 'info'" class="mt-0.5 shrink-0" />
          <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
          <button type="button" class="rounded p-0.5 opacity-70 hover:opacity-100" (click)="toasts.dismiss(toast.id)" aria-label="Fermer la notification">
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected readonly toasts = inject(ToastService);
  protected readonly styles = STYLES;
}
