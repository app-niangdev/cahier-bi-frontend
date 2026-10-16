import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Boutique, BoutiquePayload } from './boutique.model';

export interface BoutiqueRepository {
  /** Boutiques accessibles à l'utilisateur connecté (GET /manager/boutiques). */
  mine(): Observable<Boutique[]>;
  /** Administration (GET /boutiques/list), y compris les boutiques supprimées. */
  list(): Observable<Boutique[]>;
  create(payload: BoutiquePayload): Observable<Boutique>;
  update(id: number, payload: BoutiquePayload): Observable<Boutique>;
  delete(id: number): Observable<Boutique>;
  restore(id: number): Observable<Boutique>;
}

export const BOUTIQUE_REPOSITORY = new InjectionToken<BoutiqueRepository>('BOUTIQUE_REPOSITORY');
