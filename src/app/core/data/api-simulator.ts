import { Injectable, signal, untracked } from '@angular/core';
import { Observable, defer, map, timer } from 'rxjs';
import { ApiError } from './api-error';

const MIN_LATENCY_MS = 300;
const MAX_LATENCY_MS = 600;

/**
 * Simule le comportement réseau de l'API : latence de 300 à 600 ms,
 * erreurs serveur à la demande, et copie profonde des réponses
 * (l'écran ne peut jamais modifier la « base » par référence).
 */
@Injectable({ providedIn: 'root' })
export class ApiSimulator {
  /** Le prochain appel échouera (bouton « Simuler une erreur » du menu utilisateur). */
  readonly failNextCall = signal(false);
  /** Probabilité d'échec de chaque appel (0 = jamais). */
  readonly errorRate = signal(0);

  /**
   * Exécute `handler` après la latence simulée, au moment de la souscription
   * (comme une requête HTTP froide). Une ApiError levée par le handler devient
   * une erreur de l'Observable.
   */
  request<T>(handler: () => T): Observable<T> {
    return defer(() => {
      // L'échec est décidé à l'envoi : c'est bien la première requête lancée qui échoue.
      // Lecture hors suivi : un effect qui lance une requête ne doit pas dépendre de ces signals.
      const fail = untracked(() => this.failNextCall() || Math.random() < this.errorRate());
      if (fail) this.failNextCall.set(false);
      const latency = MIN_LATENCY_MS + Math.floor(Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS + 1));
      return timer(latency).pipe(
        map(() => {
          if (fail) {
            throw new ApiError('Le serveur ne répond pas (erreur simulée). Veuillez réessayer.', 'SERVER_ERROR', 500);
          }
          return structuredClone(handler());
        }),
      );
    });
  }
}
