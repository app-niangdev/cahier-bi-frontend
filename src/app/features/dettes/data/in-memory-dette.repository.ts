import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/data/api-error';
import { ApiSimulator } from '../../../core/data/api-simulator';
import { InMemoryDb } from '../../../core/data/in-memory-db';
import { Role } from '../../../core/domain/enums';
import { repartirVersement } from '../../paiements/data/encaissement';
import { EncaissementPayload, VersementResultat } from '../../paiements/domain/paiement.model';
import { estOuverte } from '../domain/dette-rules';
import { ClientResume, Dette, DetteCreatePayload, DetteDetail, DetteFiltres, DetteUpdatePayload } from '../domain/dette.model';
import { DetteRepository } from '../domain/dette.repository';

@Injectable()
export class InMemoryDetteRepository implements DetteRepository {
  private readonly db = inject(InMemoryDb);
  private readonly api = inject(ApiSimulator);

  list(boutiqueId: number, filtres: DetteFiltres = {}): Observable<Dette[]> {
    return this.api.request(() => {
      this.db.boutiqueAccessible(boutiqueId);
      return this.db.dettes
        .filter(
          (d) =>
            d.boutique_id === boutiqueId &&
            (!filtres.statut || d.statut === filtres.statut) &&
            (!filtres.client_id || d.client_id === filtres.client_id) &&
            (!filtres.du || d.date_creation >= filtres.du) &&
            (!filtres.au || d.date_creation <= filtres.au),
        )
        .sort((a, b) => b.date_creation.localeCompare(a.date_creation) || b.id - a.id)
        .map((d) => ({ ...d, client: this.clientResume(d.client_id) }));
    });
  }

  get(id: number): Observable<DetteDetail> {
    return this.api.request(() => {
      const dette = this.dette(id);
      return {
        ...dette,
        client: this.clientResume(dette.client_id),
        paiements: this.db.paiements
          .filter((p) => p.dette_id === id)
          .sort((a, b) => b.date_paiement.localeCompare(a.date_paiement) || b.id - a.id),
      };
    });
  }

  create(boutiqueId: number, payload: DetteCreatePayload): Observable<Dette> {
    return this.api.request(() => {
      this.db.boutiqueAccessible(boutiqueId);
      const client = this.db.findOrFail(this.db.clients, payload.client_id, 'Client');
      if (client.boutique_id !== boutiqueId) throw new ApiError('Client introuvable.', 'NOT_FOUND', 404);
      if (!(payload.montant > 0)) throw new ApiError('Le montant doit être supérieur à 0.', 'MONTANT_INVALIDE', 422);

      const numero = this.db.dettes.filter((d) => d.boutique_id === boutiqueId).length + 1;
      const dette: Dette = {
        id: this.db.nextId(this.db.dettes),
        boutique_id: boutiqueId,
        client_id: client.id,
        reference: `D-${String(numero).padStart(4, '0')}`,
        montant: Math.round(payload.montant),
        montant_paye: 0,
        montant_restant: Math.round(payload.montant),
        date_creation: payload.date_creation || this.db.today,
        date_echeance: payload.date_echeance || null,
        statut: 'en_attente',
        note: payload.note?.trim() || null,
      };
      this.db.dettes.push(dette);
      return this.db.recalculerDette(dette);
    });
  }

  update(id: number, payload: DetteUpdatePayload): Observable<Dette> {
    return this.api.request(() => {
      const dette = this.dette(id);
      const par = this.db.currentUser();
      if (dette.statut === 'annulee') {
        throw new ApiError('Une dette annulée ne peut plus être modifiée.', 'DETTE_CLOSE', 422);
      }
      if (payload.montant !== undefined && payload.montant !== dette.montant) {
        if (par.role !== Role.Proprietaire) {
          throw new ApiError("Seul le propriétaire peut modifier le montant d'une dette.", 'FORBIDDEN', 403);
        }
        if (payload.montant < dette.montant_paye) {
          throw new ApiError(
            `Le montant ne peut pas être inférieur à ce que le client a déjà payé (${new Intl.NumberFormat('fr-FR').format(dette.montant_paye).replace(/\s/g, ' ')} F).`,
            'MONTANT_INFERIEUR_AU_PAYE',
            422,
          );
        }
        dette.montant = Math.round(payload.montant);
      }
      dette.date_echeance = payload.date_echeance || null;
      dette.note = payload.note?.trim() || null;
      return this.db.recalculerDette(dette);
    });
  }

  payer(id: number, payload: EncaissementPayload): Observable<VersementResultat> {
    return this.api.request(() => {
      const dette = this.dette(id);
      if (!estOuverte(dette)) {
        throw new ApiError(
          dette.statut === 'payee' ? 'Cette dette est déjà soldée.' : 'Cette dette est annulée.',
          'DETTE_CLOSE',
          422,
        );
      }
      const client = this.db.findOrFail(this.db.clients, dette.client_id, 'Client');
      return repartirVersement(this.db, client, [dette], payload, this.db.currentUser());
    });
  }

  annuler(id: number): Observable<Dette> {
    return this.api.request(() => {
      this.db.requireRole(Role.Proprietaire);
      const dette = this.dette(id);
      if (this.db.paiements.some((p) => p.dette_id === id)) {
        throw new ApiError(
          "Cette dette a déjà reçu des paiements : annulez d'abord les versements concernés.",
          'DETTE_HAS_PAYMENTS',
          422,
        );
      }
      dette.statut = 'annulee';
      return this.db.recalculerDette(dette);
    });
  }

  private dette(id: number): Dette {
    const dette = this.db.findOrFail(this.db.dettes, id, 'Dette');
    this.db.boutiqueAccessible(dette.boutique_id);
    return dette;
  }

  private clientResume(clientId: number): ClientResume {
    const c = this.db.clients.find((cl) => cl.id === clientId);
    return { id: clientId, nom: c?.nom ?? 'Client supprimé', telephone: c?.telephone ?? null, whatsapp: c?.whatsapp ?? null };
  }
}
