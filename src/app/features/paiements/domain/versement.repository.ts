import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Versement } from './paiement.model';

export interface VersementFiltres {
  client_id?: number | null;
  du?: string | null;
  au?: string | null;
}

export interface VersementRepository {
  list(boutiqueId: number, filtres?: VersementFiltres): Observable<Versement[]>;
  /** GET /manager/clients/{id}/versements */
  byClient(clientId: number): Observable<Versement[]>;
  /** DELETE /manager/versements/{uuid} : réservé au propriétaire, annule toutes les lignes. */
  annuler(versement: string): Observable<void>;
}

export const VERSEMENT_REPOSITORY = new InjectionToken<VersementRepository>('VERSEMENT_REPOSITORY');
