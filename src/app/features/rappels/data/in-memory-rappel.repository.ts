import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/data/api-error';
import { ApiSimulator } from '../../../core/data/api-simulator';
import { InMemoryDb } from '../../../core/data/in-memory-db';
import { estOuverte } from '../../dettes/domain/dette-rules';
import { Rappel, RappelPayload } from '../domain/rappel.model';
import { RappelRepository } from '../domain/rappel.repository';

@Injectable()
export class InMemoryRappelRepository implements RappelRepository {
  private readonly db = inject(InMemoryDb);
  private readonly api = inject(ApiSimulator);

  list(boutiqueId: number): Observable<Rappel[]> {
    return this.api.request(() => {
      this.db.boutiqueAccessible(boutiqueId);
      return this.db.rappels
        .filter((r) => r.boutique_id === boutiqueId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    });
  }

  envoyer(payload: RappelPayload): Observable<Rappel> {
    return this.api.request(() => {
      const dette = this.db.findOrFail(this.db.dettes, payload.dette_id, 'Dette');
      this.db.boutiqueAccessible(dette.boutique_id);
      if (!estOuverte(dette)) {
        throw new ApiError("Cette dette n'est plus ouverte : aucun rappel à envoyer.", 'DETTE_CLOSE', 422);
      }
      if (!payload.message.trim()) throw new ApiError('Le message est vide.', 'MESSAGE_VIDE', 422);

      const client = this.db.clients.find((c) => c.id === dette.client_id);
      const numero = payload.canal === 'whatsapp' ? client?.whatsapp : client?.telephone;
      const now = new Date().toISOString();
      const rappel: Rappel = {
        id: this.db.nextId(this.db.rappels),
        dette_id: dette.id,
        boutique_id: dette.boutique_id,
        canal: payload.canal,
        ton: payload.ton,
        statut: numero ? 'envoye' : 'echoue',
        envoye_le: now,
        message: payload.message.trim(),
        erreur: numero ? null : payload.canal === 'whatsapp' ? "Le client n'a pas de numéro WhatsApp." : "Le client n'a pas de numéro de téléphone.",
        created_at: now,
      };
      this.db.rappels.push(rappel);
      return rappel;
    });
  }
}
