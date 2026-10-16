import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { EncaissementPayload, VersementResultat } from '../../paiements/domain/paiement.model';
import { Dette, DetteCreatePayload, DetteDetail, DetteFiltres, DetteUpdatePayload } from './dette.model';

/** Équivalent de /manager/dettes/*. */
export interface DetteRepository {
  list(boutiqueId: number, filtres?: DetteFiltres): Observable<Dette[]>;
  get(id: number): Observable<DetteDetail>;
  create(boutiqueId: number, payload: DetteCreatePayload): Observable<Dette>;
  update(id: number, payload: DetteUpdatePayload): Observable<Dette>;
  /** Paiement d'une dette précise (montant ≤ montant restant). */
  payer(id: number, payload: EncaissementPayload): Observable<VersementResultat>;
  /** Réservé au propriétaire ; refusé si la dette a des paiements. */
  annuler(id: number): Observable<Dette>;
}

export const DETTE_REPOSITORY = new InjectionToken<DetteRepository>('DETTE_REPOSITORY');
