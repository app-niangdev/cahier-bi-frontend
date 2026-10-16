import { DestroyRef, computed, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { errorMessage } from '../../core/data/api-error';

/**
 * État d'un chargement asynchrone en signals : data / loading / error,
 * avec `reload()` pour le bouton « Réessayer ».
 * À instancier dans un contexte d'injection (champ de composant ou de store).
 */
export class Loadable<T> {
  readonly data = signal<T | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** Premier chargement en cours (affiche les skeletons) */
  readonly initialLoading = computed(() => this.loading() && this.data() === null);

  private subscription: Subscription | null = null;
  private source: (() => Observable<T>) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
  }

  load(source: () => Observable<T>, options: { keepData?: boolean } = {}): void {
    this.source = source;
    this.subscription?.unsubscribe();
    if (!options.keepData) this.data.set(null);
    this.loading.set(true);
    this.error.set(null);
    this.subscription = source().subscribe({
      next: (value) => {
        this.data.set(value);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  /** Recharge la dernière source ; `silent` garde les données affichées pendant le chargement. */
  reload(silent = false): void {
    if (this.source) this.load(this.source, { keepData: silent });
  }

  reset(): void {
    this.subscription?.unsubscribe();
    this.data.set(null);
    this.loading.set(false);
    this.error.set(null);
  }
}
