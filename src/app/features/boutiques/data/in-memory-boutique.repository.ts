import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/data/api-error';
import { ApiSimulator } from '../../../core/data/api-simulator';
import { InMemoryDb } from '../../../core/data/in-memory-db';
import { Role } from '../../../core/domain/enums';
import { slugify } from '../../../core/utils/random';
import { normalizeTelephone } from '../../../core/utils/telephone';
import { Boutique, BoutiquePayload } from '../domain/boutique.model';
import { BoutiqueRepository } from '../domain/boutique.repository';

@Injectable()
export class InMemoryBoutiqueRepository implements BoutiqueRepository {
  private readonly db = inject(InMemoryDb);
  private readonly api = inject(ApiSimulator);

  mine(): Observable<Boutique[]> {
    return this.api.request(() => this.db.boutiquesAccessibles());
  }

  list(): Observable<Boutique[]> {
    return this.api.request(() => {
      this.db.requireRole(Role.Admin);
      return [...this.db.boutiques];
    });
  }

  create(payload: BoutiquePayload): Observable<Boutique> {
    return this.api.request(() => {
      this.db.requireRole(Role.Admin);
      this.db.findOrFail(this.db.tenants, payload.tenant_id, 'Propriétaire');
      const boutique: Boutique = {
        id: this.db.nextId(this.db.boutiques),
        ...this.normaliser(payload),
        slug: this.slugUnique(payload.nom),
        logo_path: null,
        deleted_at: null,
      };
      this.db.boutiques.push(boutique);
      return boutique;
    });
  }

  update(id: number, payload: BoutiquePayload): Observable<Boutique> {
    return this.api.request(() => {
      this.db.requireRole(Role.Admin);
      const boutique = this.db.findOrFail(this.db.boutiques, id, 'Boutique');
      if (payload.tenant_id !== boutique.tenant_id && this.db.gerantsDe(id).length > 0) {
        throw new ApiError(
          'Cette boutique a des gérants : impossible de la rattacher à un autre propriétaire.',
          'BOUTIQUE_HAS_GERANTS',
          422,
        );
      }
      Object.assign(boutique, this.normaliser(payload));
      return boutique;
    });
  }

  delete(id: number): Observable<Boutique> {
    return this.api.request(() => {
      this.db.requireRole(Role.Admin);
      const boutique = this.db.findOrFail(this.db.boutiques, id, 'Boutique');
      boutique.deleted_at = new Date().toISOString();
      return boutique;
    });
  }

  restore(id: number): Observable<Boutique> {
    return this.api.request(() => {
      this.db.requireRole(Role.Admin);
      const boutique = this.db.findOrFail(this.db.boutiques, id, 'Boutique');
      boutique.deleted_at = null;
      return boutique;
    });
  }

  private normaliser(payload: BoutiquePayload): BoutiquePayload {
    return {
      ...payload,
      nom: payload.nom.trim(),
      telephone: normalizeTelephone(payload.telephone),
      whatsapp: normalizeTelephone(payload.whatsapp),
    };
  }

  private slugUnique(nom: string): string {
    const base = slugify(nom) || 'boutique';
    let slug = base;
    let i = 2;
    while (this.db.boutiques.some((b) => b.slug === slug)) slug = `${base}-${i++}`;
    return slug;
  }
}
