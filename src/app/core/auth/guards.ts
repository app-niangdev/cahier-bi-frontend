import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';
import { Role } from '../domain/enums';
import { AuthStore, homeUrlFor } from './auth.store';

function withSession(
  state: RouterStateSnapshot,
  check: (auth: AuthStore, router: Router) => boolean | UrlTree,
): Observable<boolean | UrlTree> {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return auth
    .restore()
    .pipe(map((ok) => (ok ? check(auth, router) : router.createUrlTree(['/connexion'], { queryParams: { retour: state.url } }))));
}

/** Utilisateur connecté obligatoire. */
export const authGuard: CanActivateFn = (_route, state) => withSession(state, () => true);

/** Pages publiques (connexion, inscription) : un utilisateur connecté va dans son espace. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return auth.restore().pipe(map((ok) => (ok ? router.parseUrl(auth.homeUrl()) : true)));
};

/** Rôles autorisés ; sinon redirection vers l'espace du rôle. */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return (_route, state) =>
    withSession(state, (auth, router) => {
      const role = auth.role();
      return role && roles.includes(role) ? true : router.parseUrl(homeUrlFor(role));
    });
}

/** Équivalent du middleware `subscription` : abonnement expiré → page dédiée. */
export const subscriptionGuard: CanActivateFn = (_route, state) =>
  withSession(state, (auth, router) => (auth.abonnementActif() ? true : router.parseUrl('/abonnement-expire')));
