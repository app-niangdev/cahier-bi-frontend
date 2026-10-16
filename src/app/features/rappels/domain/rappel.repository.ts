import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Rappel, RappelPayload } from './rappel.model';

export interface RappelRepository {
  list(boutiqueId: number): Observable<Rappel[]>;
  /** Envoi simulé : le rappel revient avec le statut `envoye` ou `echoue`. */
  envoyer(payload: RappelPayload): Observable<Rappel>;
}

export const RAPPEL_REPOSITORY = new InjectionToken<RappelRepository>('RAPPEL_REPOSITORY');
