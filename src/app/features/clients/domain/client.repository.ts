import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { EncaissementPayload, VersementResultat } from '../../paiements/domain/paiement.model';
import { Client, ClientPayload } from './client.model';

/** Équivalent de /manager/clients/*. */
export interface ClientRepository {
  list(boutiqueId: number): Observable<Client[]>;
  get(id: number): Observable<Client>;
  create(boutiqueId: number, payload: ClientPayload): Observable<Client>;
  update(id: number, payload: ClientPayload): Observable<Client>;
  delete(id: number): Observable<void>;
  /** Versement global réparti de la dette la plus ancienne à la plus récente. */
  encaisser(clientId: number, payload: EncaissementPayload): Observable<VersementResultat>;
}

export const CLIENT_REPOSITORY = new InjectionToken<ClientRepository>('CLIENT_REPOSITORY');
