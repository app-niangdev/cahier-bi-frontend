import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { AUTH_REPOSITORY, AuthSession, AuthStep } from '../../features/auth/domain/auth.repository';
import { Tenant } from '../../features/tenants/domain/tenant.model';
import { ApiError } from '../data/api-error';
import { Role } from '../domain/enums';
import { User } from '../domain/user.model';
import { TokenStorage } from './token-storage';

/** Session de l'utilisateur connecté (état global en signals). */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly repo = inject(AUTH_REPOSITORY);
  private readonly tokens = inject(TokenStorage);

  private readonly _session = signal<AuthSession | null>(null);
  private restoring$: Observable<boolean> | null = null;

  readonly session = this._session.asReadonly();
  readonly user = computed<User | null>(() => this._session()?.user ?? null);
  readonly tenant = computed<Tenant | null>(() => this._session()?.tenant ?? null);
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly isAdmin = computed(() => this.role() === Role.Admin);
  readonly isProprietaire = computed(() => this.role() === Role.Proprietaire);
  readonly isGerant = computed(() => this.role() === Role.Gerant);
  readonly abonnementActif = computed(() => this._session()?.abonnement_actif ?? true);

  /** Espace d'accueil selon le rôle. */
  readonly homeUrl = computed(() => homeUrlFor(this.role()));

  /** Propriétaire et gérant : numéro WhatsApp. */
  loginWithPhone(telephone: string, password: string): Observable<AuthStep> {
    return this.repo.loginWithPhone(telephone, password).pipe(tap((step) => this.openStep(step)));
  }

  /** Administrateur : adresse e-mail. */
  loginWithEmail(email: string, password: string): Observable<AuthStep> {
    return this.repo.loginWithEmail(email, password).pipe(tap((step) => this.openStep(step)));
  }

  /** Ouvre la session si l'étape la termine (connexion, code WhatsApp validé). */
  openStep(step: AuthStep): void {
    if (step.step === 'authenticated') this.open(step.session);
  }

  /** Ouvre la session (connexion, fin d'inscription, nouveau mot de passe). */
  open(session: AuthSession): void {
    if (session.token) this.tokens.set(session.token, session.refresh_token);
    this._session.set(session);
  }

  /**
   * Restaure la session mémorisée au démarrage (GET /auth/me).
   * Partagé entre les guards appelés pendant la même navigation.
   */
  restore(): Observable<boolean> {
    if (this._session()) return of(true);
    if (!this.tokens.token()) return of(false);
    this.restoring$ ??= this.repo.me().pipe(
      tap((session) => this._session.set(session)),
      map(() => true),
      catchError((e: unknown) => {
        // Abonnement expiré : /auth/me est refusé, la session reste ouverte sur la page dédiée
        const expired = e instanceof ApiError && e.code === 'SUBSCRIPTION_EXPIRED' ? this.sessionFromToken() : null;
        if (expired) {
          this._session.set(expired);
          return of(true);
        }
        this.tokens.clear();
        return of(false);
      }),
      finalize(() => (this.restoring$ = null)),
      shareReplay(1),
    );
    return this.restoring$;
  }

  updateUser(user: User): void {
    this._session.update((s) => (s ? { ...s, user } : s));
  }

  updateTenant(tenant: Tenant): void {
    this._session.update((s) => (s ? { ...s, tenant } : s));
  }

  /** Le mot de passe provisoire de l'administrateur a été remplacé. */
  passwordReplaced(): void {
    this._session.update((s) => (s ? { ...s, must_change_password: false } : s));
  }

  /** Session refusée par l'API (jetons expirés ou révoqués) : fermée sans appel au serveur. */
  expire(): void {
    this.tokens.clear();
    this._session.set(null);
  }

  logout(): void {
    if (this.tokens.token()) this.repo.logout().subscribe({ error: () => undefined });
    this.tokens.clear();
    this._session.set(null);
  }

  /** Session minimale lue dans le jeton d'accès (claims `user` de TokenService). */
  private sessionFromToken(): AuthSession | null {
    const token = this.tokens.token();
    try {
      const claims = JSON.parse(atob(token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
        user?: { id: number; full_name: string; role: Role; tenant_id: number | null };
      };
      if (!claims.user) return null;
      const { id, full_name, role, tenant_id } = claims.user;
      return {
        token: token!,
        refresh_token: this.tokens.refreshToken(),
        user: { id, name: full_name, telephone: '', role, tenant_id, boutique_id: null, is_active: true },
        tenant: null,
        abonnement_actif: false,
        must_change_password: false,
      };
    } catch {
      return null;
    }
  }
}

export function homeUrlFor(role: Role | null): string {
  if (role === Role.Admin) return '/admin';
  if (role) return '/app';
  return '/connexion';
}
