import { Injectable, computed, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { User } from '../../../core/domain/user.model';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ActionRunner, ActionOptions } from '../../../shared/utils/action-runner';
import { Loadable } from '../../../shared/utils/loadable';
import { Boutique } from '../../boutiques/domain/boutique.model';
import { GERANT_REPOSITORY, GerantsListe, PlacesBoutique } from '../domain/gerant.repository';

export interface BoutiqueGerants {
  boutique: Boutique;
  places: PlacesBoutique;
  gerants: User[];
}

@Injectable()
export class GerantsStore {
  readonly repo = inject(GERANT_REPOSITORY);
  private readonly ctx = inject(BoutiqueContextStore);

  readonly liste = new Loadable<GerantsListe>();
  readonly action = new ActionRunner(inject(ToastService));

  readonly parBoutique = computed<BoutiqueGerants[]>(() => {
    const data = this.liste.data();
    if (!data) return [];
    return this.ctx.boutiques().map((boutique) => ({
      boutique,
      places: data.places.find((p) => p.boutique_id === boutique.id) ?? { boutique_id: boutique.id, max: 0, utilises: 0, restantes: 0 },
      gerants: data.gerants.filter((g) => g.boutique_id === boutique.id),
    }));
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.liste.load(() => this.repo.list());
  }

  /** Exécute une mutation puis recharge la liste (quotas compris). */
  run<T>(source: Observable<T>, options: ActionOptions<T>): void {
    this.action.run(source.pipe(tap(() => this.liste.reload(true))), options);
  }
}
