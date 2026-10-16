import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { BOUTIQUE_REPOSITORY } from '../../features/boutiques/domain/boutique.repository';
import { Boutique } from '../../features/boutiques/domain/boutique.model';
import { AuthStore } from '../auth/auth.store';
import { errorMessage } from '../data/api-error';

const STORAGE_KEY = 'cahier-bi.boutique';

/**
 * Boutique de travail : le propriétaire choisit parmi ses boutiques,
 * le gérant est fixé sur la sienne.
 */
@Injectable({ providedIn: 'root' })
export class BoutiqueContextStore {
  private readonly repo = inject(BOUTIQUE_REPOSITORY);
  private readonly auth = inject(AuthStore);

  readonly boutiques = signal<Boutique[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private readonly selectedId = signal<number | null>(readStored());

  readonly current = computed<Boutique | null>(() => {
    const list = this.boutiques();
    return list.find((b) => b.id === this.selectedId()) ?? list[0] ?? null;
  });
  readonly currentId = computed(() => this.current()?.id ?? null);
  readonly canSwitch = computed(() => this.auth.isProprietaire() && this.boutiques().length > 1);

  constructor() {
    // Recharge les boutiques à chaque changement d'utilisateur
    effect(() => {
      const user = this.auth.user();
      untracked(() => (user && user.role !== 'ADMIN' ? this.load() : this.boutiques.set([])));
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.repo.mine().subscribe({
      next: (boutiques) => {
        this.boutiques.set(boutiques);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  select(id: number): void {
    this.selectedId.set(id);
    try {
      localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // stockage indisponible : le choix reste en mémoire
    }
  }
}

function readStored(): number | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? Number(value) : null;
  } catch {
    return null;
  }
}
