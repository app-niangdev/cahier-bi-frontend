import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/** Confirmation avant une action destructrice : `if (await confirm.ask({...}))`. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    this.request()?.resolve(false);
    return new Promise((resolve) => this.request.set({ danger: true, ...options, resolve }));
  }

  answer(ok: boolean): void {
    const request = this.request();
    if (!request) return;
    this.request.set(null);
    request.resolve(ok);
  }
}
