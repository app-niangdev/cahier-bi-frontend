import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/data/api-error';
import { ApiSimulator } from '../../../core/data/api-simulator';
import { InMemoryDb } from '../../../core/data/in-memory-db';
import { normalizeTelephone } from '../../../core/utils/telephone';
import { estOuverte } from '../../dettes/domain/dette-rules';
import { repartirVersement } from '../../paiements/data/encaissement';
import { EncaissementPayload, VersementResultat } from '../../paiements/domain/paiement.model';
import { Client, ClientPayload } from '../domain/client.model';
import { ClientRepository } from '../domain/client.repository';

@Injectable()
export class InMemoryClientRepository implements ClientRepository {
  private readonly db = inject(InMemoryDb);
  private readonly api = inject(ApiSimulator);

  list(boutiqueId: number): Observable<Client[]> {
    return this.api.request(() => {
      this.db.boutiqueAccessible(boutiqueId);
      return this.db.clients
        .filter((c) => c.boutique_id === boutiqueId)
        .map((c) => this.db.clientAvecTotaux(c))
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    });
  }

  get(id: number): Observable<Client> {
    return this.api.request(() => this.db.clientAvecTotaux(this.client(id)));
  }

  create(boutiqueId: number, payload: ClientPayload): Observable<Client> {
    return this.api.request(() => {
      this.db.boutiqueAccessible(boutiqueId);
      const client: Client = {
        id: this.db.nextId(this.db.clients),
        boutique_id: boutiqueId,
        ...this.normaliser(payload),
        photo_path: null,
        total_du: 0,
        nb_dettes_ouvertes: 0,
        nb_dettes_en_retard: 0,
      };
      this.db.clients.push(client);
      return client;
    });
  }

  update(id: number, payload: ClientPayload): Observable<Client> {
    return this.api.request(() => {
      const client = this.client(id);
      Object.assign(client, this.normaliser(payload));
      return this.db.clientAvecTotaux(client);
    });
  }

  delete(id: number): Observable<void> {
    return this.api.request(() => {
      const client = this.db.clientAvecTotaux(this.client(id));
      if (client.total_du > 0) {
        throw new ApiError(
          'Ce client a encore des dettes en cours : réglez-les ou annulez-les avant de le supprimer.',
          'CLIENT_HAS_DETTES',
          422,
        );
      }
      this.db.clients.splice(this.db.clients.findIndex((c) => c.id === id), 1);
    });
  }

  encaisser(clientId: number, payload: EncaissementPayload): Observable<VersementResultat> {
    return this.api.request(() => {
      const client = this.client(clientId);
      const ouvertes = this.db.dettes.filter((d) => d.client_id === clientId && estOuverte(d));
      return repartirVersement(this.db, client, ouvertes, payload, this.db.currentUser());
    });
  }

  /** Client du périmètre de l'utilisateur connecté. */
  private client(id: number): Client {
    const client = this.db.findOrFail(this.db.clients, id, 'Client');
    this.db.boutiqueAccessible(client.boutique_id);
    return client;
  }

  private normaliser(payload: ClientPayload): ClientPayload {
    return {
      nom: payload.nom.trim(),
      telephone: normalizeTelephone(payload.telephone),
      whatsapp: normalizeTelephone(payload.whatsapp),
      adresse: payload.adresse?.trim() || null,
      note: payload.note?.trim() || null,
    };
  }
}
