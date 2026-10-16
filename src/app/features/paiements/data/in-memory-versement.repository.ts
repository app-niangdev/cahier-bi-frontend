import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/data/api-error';
import { ApiSimulator } from '../../../core/data/api-simulator';
import { InMemoryDb } from '../../../core/data/in-memory-db';
import { Role } from '../../../core/domain/enums';
import { Versement } from '../domain/paiement.model';
import { VersementFiltres, VersementRepository } from '../domain/versement.repository';
import { grouperVersements } from './versements';

@Injectable()
export class InMemoryVersementRepository implements VersementRepository {
  private readonly db = inject(InMemoryDb);
  private readonly api = inject(ApiSimulator);

  list(boutiqueId: number, filtres: VersementFiltres = {}): Observable<Versement[]> {
    return this.api.request(() => {
      this.db.boutiqueAccessible(boutiqueId);
      return grouperVersements(
        this.db,
        this.db.paiements.filter(
          (p) =>
            p.boutique_id === boutiqueId &&
            (!filtres.client_id || p.client_id === filtres.client_id) &&
            (!filtres.du || p.date_paiement >= filtres.du) &&
            (!filtres.au || p.date_paiement <= filtres.au),
        ),
      );
    });
  }

  byClient(clientId: number): Observable<Versement[]> {
    return this.api.request(() => {
      const client = this.db.findOrFail(this.db.clients, clientId, 'Client');
      this.db.boutiqueAccessible(client.boutique_id);
      return grouperVersements(this.db, this.db.paiements.filter((p) => p.client_id === clientId));
    });
  }

  /** Supprime toutes les lignes du versement puis recalcule les dettes touchées. */
  annuler(versement: string): Observable<void> {
    return this.api.request(() => {
      this.db.requireRole(Role.Proprietaire);
      const accessibles = new Set(this.db.boutiquesAccessibles().map((b) => b.id));
      const lignes = this.db.paiements.filter((p) => p.versement === versement && accessibles.has(p.boutique_id));
      if (lignes.length === 0) throw new ApiError('Versement introuvable.', 'VERSEMENT_NOT_FOUND', 404);

      for (const ligne of lignes) {
        this.db.paiements.splice(this.db.paiements.indexOf(ligne), 1);
      }
      for (const detteId of new Set(lignes.map((l) => l.dette_id))) {
        const dette = this.db.dettes.find((d) => d.id === detteId);
        if (dette) this.db.recalculerDette(dette);
      }
    });
  }
}
