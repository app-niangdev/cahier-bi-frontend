import { InjectionToken } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

/** URL de l'API Laravel, préfixe /api compris (src/environments). */
export const API_URL = new InjectionToken<string>('API_URL', { factory: () => environment.apiUrl });

/** Enveloppe des réponses Laravel (App\Helpers\ApiResponse). */
export interface ApiEnvelope<T> {
  status: number;
  message: string;
  payload: T;
}

/** Extrait `payload` de l'enveloppe. */
export function payload<T>() {
  return (source: Observable<ApiEnvelope<T>>): Observable<T> => source.pipe(map((res) => res.payload));
}

/** Réponse paginée (ApiResponse::paginated). */
export interface ApiPage<T> extends ApiEnvelope<T[]> {
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

/**
 * Toutes les lignes d'une liste paginée : première page, puis les suivantes en parallèle.
 * Les écrans d'administration filtrent et trient côté client.
 */
export function fetchAll<T>(page: (page: number) => Observable<ApiPage<T>>): Observable<T[]> {
  return page(1).pipe(
    switchMap((first) => {
      const rest = Array.from({ length: Math.max(0, first.meta.last_page - 1) }, (_, i) => page(i + 2));
      return rest.length === 0
        ? of(first.payload)
        : forkJoin(rest).pipe(map((pages) => first.payload.concat(...pages.map((p) => p.payload))));
    }),
  );
}
