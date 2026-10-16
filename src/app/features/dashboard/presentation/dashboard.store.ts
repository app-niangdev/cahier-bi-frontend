import { Injectable, effect, inject, untracked } from '@angular/core';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { Loadable } from '../../../shared/utils/loadable';
import { DASHBOARD_REPOSITORY, DashboardStats } from '../domain/dashboard.repository';

@Injectable()
export class DashboardStore {
  private readonly repo = inject(DASHBOARD_REPOSITORY);
  private readonly ctx = inject(BoutiqueContextStore);

  readonly stats = new Loadable<DashboardStats>();

  constructor() {
    effect(() => {
      const boutiqueId = this.ctx.currentId();
      untracked(() => (boutiqueId ? this.stats.load(() => this.repo.stats(boutiqueId)) : this.stats.reset()));
    });
  }
}
