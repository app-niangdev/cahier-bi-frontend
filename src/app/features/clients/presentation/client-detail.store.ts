import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { Loadable } from '../../../shared/utils/loadable';
import { Dette } from '../../dettes/domain/dette.model';
import { estOuverte } from '../../dettes/domain/dette-rules';
import { DETTE_REPOSITORY } from '../../dettes/domain/dette.repository';
import { EncaissementPayload, Versement, VersementResultat } from '../../paiements/domain/paiement.model';
import { VERSEMENT_REPOSITORY } from '../../paiements/domain/versement.repository';
import { Client } from '../domain/client.model';
import { CLIENT_REPOSITORY } from '../domain/client.repository';

interface FicheClient {
  client: Client;
  dettes: Dette[];
  versements: Versement[];
}

/** Fiche client : dettes, historique des versements, encaissement global. */
@Injectable()
export class ClientDetailStore {
  private readonly clients = inject(CLIENT_REPOSITORY);
  private readonly dettesRepo = inject(DETTE_REPOSITORY);
  private readonly versementsRepo = inject(VERSEMENT_REPOSITORY);
  private readonly ctx = inject(BoutiqueContextStore);

  readonly fiche = new Loadable<FicheClient>();
  readonly action = new ActionRunner(inject(ToastService));
  readonly clientId = signal<number | null>(null);

  readonly dettesOuvertes = computed(() => (this.fiche.data()?.dettes ?? []).filter(estOuverte));

  load(id: number): void {
    this.clientId.set(id);
    this.fiche.load(() =>
      forkJoin({
        client: this.clients.get(id),
        dettes: this.dettesRepo.list(this.ctx.currentId() ?? 0, { client_id: id }),
        versements: this.versementsRepo.byClient(id),
      }),
    );
  }

  encaisser(payload: EncaissementPayload, onSuccess: (r: VersementResultat) => void): void {
    const id = this.clientId();
    if (!id) return;
    this.action.run(this.clients.encaisser(id, payload), {
      success: (r) => `Versement de ${new Intl.NumberFormat('fr-FR').format(r.montant)} FCFA réparti sur ${r.repartition.length} dette${r.repartition.length > 1 ? 's' : ''}.`,
      onSuccess: (r) => {
        onSuccess(r);
        this.fiche.reload(true);
      },
    });
  }

  annulerVersement(versement: Versement): void {
    this.action.run(this.versementsRepo.annuler(versement.versement), {
      success: 'Versement annulé : les dettes concernées ont été recalculées.',
      onSuccess: () => this.fiche.reload(true),
    });
  }

  supprimer(onSuccess: () => void): void {
    const id = this.clientId();
    if (!id) return;
    this.action.run(this.clients.delete(id), { success: 'Client supprimé.', onSuccess });
  }
}
