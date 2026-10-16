import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/data/api-error';
import { ApiSimulator } from '../../../core/data/api-simulator';
import { InMemoryDb } from '../../../core/data/in-memory-db';
import { Role } from '../../../core/domain/enums';
import { User } from '../../../core/domain/user.model';
import { normalizeTelephone } from '../../../core/utils/telephone';
import {
  AccesProvisoire,
  GerantCreatePayload,
  GerantPayload,
  GerantRepository,
  GerantsListe,
} from '../domain/gerant.repository';

@Injectable()
export class InMemoryGerantRepository implements GerantRepository {
  private readonly db = inject(InMemoryDb);
  private readonly api = inject(ApiSimulator);

  list(): Observable<GerantsListe> {
    return this.api.request(() => {
      const boutiques = this.boutiquesDuProprietaire();
      const ids = new Set(boutiques.map((b) => b.id));
      return {
        gerants: this.db.users
          .filter((u) => u.role === Role.Gerant && u.boutique_id !== null && ids.has(u.boutique_id))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        places: boutiques.map((b) => this.db.placesBoutique(b)),
      };
    });
  }

  create(payload: GerantCreatePayload): Observable<AccesProvisoire> {
    return this.api.request(() => {
      const proprietaire = this.db.requireRole(Role.Proprietaire);
      const boutique = this.boutique(payload.boutique_id);
      this.db.verifierPlace(boutique);
      const telephone = this.telephone(payload.telephone);
      this.db.verifierTelephoneLibre(telephone);

      const gerant: User = {
        id: this.db.nextId(this.db.users),
        name: payload.name.trim(),
        telephone,
        role: Role.Gerant,
        tenant_id: proprietaire.tenant_id,
        boutique_id: boutique.id,
        is_active: true,
      };
      const motDePasse = this.db.motDePasseProvisoire();
      this.db.users.push(gerant);
      this.db.passwords.set(gerant.id, motDePasse);
      return { gerant, mot_de_passe_provisoire: motDePasse };
    });
  }

  update(id: number, payload: GerantPayload): Observable<User> {
    return this.api.request(() => {
      const gerant = this.gerant(id);
      const telephone = this.telephone(payload.telephone);
      this.db.verifierTelephoneLibre(telephone, id);
      gerant.name = payload.name.trim();
      gerant.telephone = telephone;
      return gerant;
    });
  }

  toggleStatus(id: number): Observable<User> {
    return this.api.request(() => {
      const gerant = this.gerant(id);
      gerant.is_active = !gerant.is_active;
      return gerant;
    });
  }

  resetAccess(id: number): Observable<AccesProvisoire> {
    return this.api.request(() => {
      const gerant = this.gerant(id);
      const motDePasse = this.db.motDePasseProvisoire();
      this.db.passwords.set(gerant.id, motDePasse);
      return { gerant, mot_de_passe_provisoire: motDePasse };
    });
  }

  delete(id: number): Observable<void> {
    return this.api.request(() => {
      const gerant = this.gerant(id);
      this.db.users.splice(this.db.users.indexOf(gerant), 1);
      this.db.passwords.delete(id);
    });
  }

  transfer(id: number, boutiqueId: number): Observable<User> {
    return this.api.request(() => {
      const gerant = this.gerant(id);
      const cible = this.boutique(boutiqueId);
      if (gerant.boutique_id === cible.id) {
        throw new ApiError('Ce gérant travaille déjà dans cette boutique.', 'TRANSFER_SAME_BOUTIQUE', 422);
      }
      // Transfert entrant bloqué si la boutique cible est pleine
      this.db.verifierPlace(cible);
      gerant.boutique_id = cible.id;
      return gerant;
    });
  }

  private boutiquesDuProprietaire() {
    const proprietaire = this.db.requireRole(Role.Proprietaire);
    return this.db.boutiquesAccessibles(proprietaire);
  }

  private boutique(id: number) {
    const boutique = this.boutiquesDuProprietaire().find((b) => b.id === id);
    if (!boutique) throw new ApiError('Boutique introuvable.', 'NOT_FOUND', 404);
    return boutique;
  }

  private gerant(id: number): User {
    const ids = new Set(this.boutiquesDuProprietaire().map((b) => b.id));
    const gerant = this.db.users.find((u) => u.id === id && u.role === Role.Gerant);
    if (!gerant || gerant.boutique_id === null || !ids.has(gerant.boutique_id)) {
      throw new ApiError('Gérant introuvable.', 'NOT_FOUND', 404);
    }
    return gerant;
  }

  private telephone(value: string): string {
    const tel = normalizeTelephone(value);
    if (!tel) throw new ApiError('Numéro de téléphone sénégalais invalide.', 'INVALID_PHONE', 422);
    return tel;
  }
}
