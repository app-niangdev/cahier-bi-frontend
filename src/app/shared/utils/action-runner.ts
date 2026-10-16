import { signal } from '@angular/core';
import { Observable } from 'rxjs';
import { errorMessage } from '../../core/data/api-error';
import { ToastService } from '../components/toast/toast.service';

export interface ActionOptions<T> {
  /** Message du toast de succès */
  success?: string | ((result: T) => string);
  onSuccess?: (result: T) => void;
  onError?: (message: string) => void;
}

/** Exécute une mutation : état `pending` et toasts de succès / d'erreur. */
export class ActionRunner {
  readonly pending = signal(false);

  constructor(private readonly toast: ToastService) {}

  run<T>(source: Observable<T>, options: ActionOptions<T> = {}): void {
    if (this.pending()) return;
    this.pending.set(true);
    source.subscribe({
      next: (result) => {
        this.pending.set(false);
        const message = typeof options.success === 'function' ? options.success(result) : options.success;
        if (message) this.toast.success(message);
        options.onSuccess?.(result);
      },
      error: (e: unknown) => {
        this.pending.set(false);
        const message = errorMessage(e);
        this.toast.error(message);
        options.onError?.(message);
      },
    });
  }
}
