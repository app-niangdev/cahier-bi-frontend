import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { TableSort } from '../../../shared/components/data-table.component';
import { Loadable } from '../../../shared/utils/loadable';
import { Client, ClientFiltre } from '../domain/client.model';
import { CLIENT_REPOSITORY } from '../domain/client.repository';

/** Liste des clients de la boutique : recherche, filtres et tri. */
@Injectable()
export class ClientsStore {
  private readonly repo = inject(CLIENT_REPOSITORY);
  private readonly ctx = inject(BoutiqueContextStore);

  readonly clients = new Loadable<Client[]>();
  readonly recherche = signal('');
  readonly filtre = signal<ClientFiltre | ''>('');
  readonly tri = signal<TableSort | null>({ key: 'total_du', dir: 'desc' });

  readonly resultats = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    const qChiffres = q.replace(/\D/g, '');
    const filtre = this.filtre();
    const tri = this.tri();

    const liste = (this.clients.data() ?? []).filter((c) => {
      const correspond =
        !q ||
        c.nom.toLowerCase().includes(q) ||
        (qChiffres.length >= 2 && ((c.telephone ?? '').includes(qChiffres) || (c.whatsapp ?? '').includes(qChiffres)));
      if (!correspond) return false;
      if (filtre === 'avec_dette') return c.total_du > 0;
      if (filtre === 'a_jour') return c.total_du === 0;
      if (filtre === 'en_retard') return c.nb_dettes_en_retard > 0;
      return true;
    });

    if (tri) {
      const sens = tri.dir === 'asc' ? 1 : -1;
      liste.sort((a, b) =>
        tri.key === 'nom' ? sens * a.nom.localeCompare(b.nom, 'fr') : sens * (a.total_du - b.total_du) || a.nom.localeCompare(b.nom, 'fr'),
      );
    }
    return liste;
  });

  readonly totalDu = computed(() => this.resultats().reduce((s, c) => s + c.total_du, 0));

  constructor() {
    effect(() => {
      const boutiqueId = this.ctx.currentId();
      untracked(() => (boutiqueId ? this.clients.load(() => this.repo.list(boutiqueId)) : this.clients.reset()));
    });
  }
}
