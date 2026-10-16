import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../../../core/domain/user.model';

/** Places de gérants d'une boutique (GerantService::places). max null = illimité. */
export interface PlacesBoutique {
  boutique_id: number;
  max: number | null;
  utilises: number;
  restantes: number | null;
}

export interface GerantsListe {
  gerants: User[];
  places: PlacesBoutique[];
}

export interface GerantPayload {
  name: string;
  telephone: string;
}

export interface GerantCreatePayload extends GerantPayload {
  boutique_id: number;
}

/** Mot de passe provisoire communiqué au gérant (première connexion). */
export interface AccesProvisoire {
  gerant: User;
  mot_de_passe_provisoire: string;
}

/** Équivalent de /manager/gerants/* (propriétaire). */
export interface GerantRepository {
  list(): Observable<GerantsListe>;
  create(payload: GerantCreatePayload): Observable<AccesProvisoire>;
  update(id: number, payload: GerantPayload): Observable<User>;
  toggleStatus(id: number): Observable<User>;
  resetAccess(id: number): Observable<AccesProvisoire>;
  delete(id: number): Observable<void>;
  transfer(id: number, boutiqueId: number): Observable<User>;
}

export const GERANT_REPOSITORY = new InjectionToken<GerantRepository>('GERANT_REPOSITORY');

export function aDesPlaces(places: PlacesBoutique | undefined): boolean {
  return !!places && (places.restantes === null || places.restantes > 0);
}
