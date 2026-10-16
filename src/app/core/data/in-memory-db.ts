import { Injectable, inject } from '@angular/core';
import { ESSAI_PLAN_NAME, AbonnementEtat, Subscription, SubscriptionPlan } from '../../features/abonnement/domain/subscription.model';
import { seedPlans, seedSubscriptions } from '../../features/abonnement/data/subscriptions.seed';
import { seedUsers } from '../../features/auth/data/users.seed';
import { Boutique } from '../../features/boutiques/domain/boutique.model';
import { seedBoutiques } from '../../features/boutiques/data/boutiques.seed';
import { Client } from '../../features/clients/domain/client.model';
import { seedClients } from '../../features/clients/data/clients.seed';
import { Dette } from '../../features/dettes/domain/dette.model';
import { estOuverte, recalculerDette } from '../../features/dettes/domain/dette-rules';
import { seedDettes } from '../../features/dettes/data/dettes.seed';
import { PlacesBoutique } from '../../features/gerants/domain/gerant.repository';
import { Paiement } from '../../features/paiements/domain/paiement.model';
import { seedPaiements } from '../../features/paiements/data/paiements.seed';
import { Rappel } from '../../features/rappels/domain/rappel.model';
import { seedRappels } from '../../features/rappels/data/rappels.seed';
import { Tenant } from '../../features/tenants/domain/tenant.model';
import { seedTenants } from '../../features/tenants/data/tenants.seed';
import { TokenStorage } from '../auth/token-storage';
import { Role } from '../domain/enums';
import { User } from '../domain/user.model';
import { diffDays, todayIso } from '../utils/dates';
import { ApiError } from './api-error';

/** Limite de gérants pendant l'essai (config subscriptions.trial_max_gerants_par_boutique). */
const ESSAI_MAX_GERANTS = 1;

/**
 * « Base de données » en mémoire, partagée par toutes les implémentations
 * InMemory*Repository. Les données sont modifiables pendant l'exécution
 * et réinitialisées au rechargement de la page.
 */
@Injectable({ providedIn: 'root' })
export class InMemoryDb {
  private readonly tokens = inject(TokenStorage);

  readonly today = todayIso();

  readonly tenants: Tenant[] = seedTenants(this.today);
  readonly users: User[] = [];
  readonly passwords = new Map<number, string>();
  readonly boutiques: Boutique[] = seedBoutiques();
  readonly clients: Client[] = seedClients();
  readonly dettes: Dette[] = seedDettes(this.clients, this.today);
  readonly paiements: Paiement[] = seedPaiements(this.dettes, this.today);
  readonly rappels: Rappel[] = seedRappels(this.dettes, this.clients, this.today);
  readonly plans: SubscriptionPlan[] = seedPlans();
  readonly subscriptions: Subscription[] = seedSubscriptions(this.today);

  constructor() {
    for (const { password, ...user } of seedUsers()) {
      this.users.push(user);
      this.passwords.set(user.id, password);
    }
    this.dettes.forEach((dette) => this.recalculerDette(dette));
  }

  nextId(rows: { id: number }[]): number {
    return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  }

  findOrFail<T extends { id: number }>(rows: T[], id: number, label = 'Élément'): T {
    const row = rows.find((r) => r.id === id);
    if (!row) throw new ApiError(`${label} introuvable.`, 'NOT_FOUND', 404);
    return row;
  }

  // ---------------------------------------------------------------- Session

  /**
   * Utilisateur de démonstration correspondant au jeton JWT de l'API (équivalent du middleware jwt.auth).
   * Transitoire, tant que ces features ne sont pas branchées sur Laravel : les identifiants réels
   * ne correspondent pas aux données en mémoire, on prend le premier compte actif du même rôle.
   */
  currentUser(): User {
    const role = roleFromJwt(this.tokens.token());
    const user = role ? this.users.find((u) => u.role === role && u.is_active) : undefined;
    if (!user) throw new ApiError('Session expirée. Veuillez vous reconnecter.', 'UNAUTHENTICATED', 401);
    return user;
  }

  requireRole(...roles: Role[]): User {
    const user = this.currentUser();
    if (!roles.includes(user.role)) {
      throw new ApiError("Vous n'avez pas les droits pour effectuer cette action.", 'FORBIDDEN', 403);
    }
    return user;
  }

  /** Boutiques accessibles à l'utilisateur connecté. */
  boutiquesAccessibles(user = this.currentUser()): Boutique[] {
    if (user.role === Role.Admin) return this.boutiques.filter((b) => !b.deleted_at);
    if (user.role === Role.Gerant) return this.boutiques.filter((b) => b.id === user.boutique_id && !b.deleted_at);
    return this.boutiques.filter((b) => b.tenant_id === user.tenant_id && !b.deleted_at);
  }

  /** Vérifie que la boutique appartient au périmètre de l'utilisateur. */
  boutiqueAccessible(boutiqueId: number): Boutique {
    const boutique = this.boutiquesAccessibles().find((b) => b.id === boutiqueId);
    if (!boutique) throw new ApiError('Boutique introuvable.', 'NOT_FOUND', 404);
    return boutique;
  }

  // ---------------------------------------------------------------- Dettes & clients

  /** Dette::recalculer : montant_paye, montant_restant et statut d'après les paiements. */
  recalculerDette(dette: Dette): Dette {
    const totalPaye = this.paiements.filter((p) => p.dette_id === dette.id).reduce((sum, p) => sum + p.montant, 0);
    return recalculerDette(dette, totalPaye, this.today);
  }

  /** Client avec ses champs calculés (total_du, nb_dettes_ouvertes, nb_dettes_en_retard). */
  clientAvecTotaux(client: Client): Client {
    const ouvertes = this.dettes.filter((d) => d.client_id === client.id && estOuverte(d));
    return {
      ...client,
      total_du: ouvertes.reduce((sum, d) => sum + d.montant_restant, 0),
      nb_dettes_ouvertes: ouvertes.length,
      nb_dettes_en_retard: ouvertes.filter((d) => d.statut === 'en_retard').length,
    };
  }

  // ---------------------------------------------------------------- Abonnements

  abonnementEtat(tenantId: number): AbonnementEtat {
    const historique = this.subscriptions
      .filter((s) => s.tenant_id === tenantId)
      .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    const courant = historique.find((s) => s.starts_at <= this.today && s.ends_at >= this.today) ?? null;
    const forfait = courant?.subscription_plan_id ? (this.plans.find((p) => p.id === courant.subscription_plan_id) ?? null) : null;
    const enEssai = courant?.plan === ESSAI_PLAN_NAME;
    const joursRestants = courant ? diffDays(this.today, courant.ends_at) + 1 : 0;

    let maxGerants: number | null = 0;
    if (enEssai) maxGerants = ESSAI_MAX_GERANTS;
    else if (forfait) maxGerants = forfait.max_gerants_par_boutique;

    return {
      actif: courant !== null,
      courant,
      forfait,
      en_essai: enEssai,
      jours_restants: joursRestants,
      jours_essai_restants: enEssai ? joursRestants : null,
      max_gerants_par_boutique: maxGerants,
      historique,
    };
  }

  /** Accès coupé si le compte est désactivé ou l'abonnement expiré (middleware `subscription`). */
  abonnementActif(user: User): boolean {
    if (user.role === Role.Admin || user.tenant_id === null) return true;
    const tenant = this.tenants.find((t) => t.id === user.tenant_id);
    if (!tenant || !tenant.state || tenant.deleted_at) return false;
    return this.abonnementEtat(user.tenant_id).actif;
  }

  // ---------------------------------------------------------------- Gérants

  gerantsDe(boutiqueId: number): User[] {
    return this.users.filter((u) => u.role === Role.Gerant && u.boutique_id === boutiqueId);
  }

  /** GerantService::places : les gérants désactivés occupent aussi une place. */
  placesBoutique(boutique: Boutique): PlacesBoutique {
    const max = this.abonnementEtat(boutique.tenant_id).max_gerants_par_boutique;
    const utilises = this.gerantsDe(boutique.id).length;
    return {
      boutique_id: boutique.id,
      max,
      utilises,
      restantes: max === null ? null : Math.max(0, max - utilises),
    };
  }

  /** GerantService::verifierPlace */
  verifierPlace(boutique: Boutique): void {
    if (boutique.statut !== 'actif' || boutique.deleted_at) {
      throw new ApiError("Cette boutique n'est pas active : impossible d'y affecter un gérant.", 'BOUTIQUE_INACTIVE', 422);
    }
    const places = this.placesBoutique(boutique);
    if (places.restantes === 0) {
      throw new ApiError(
        places.max === 0
          ? "Votre abonnement ne permet pas d'ajouter de gérant. Renouvelez-le ou changez de forfait."
          : `La boutique « ${boutique.nom} » a atteint sa limite de ${places.max} gérant${(places.max ?? 0) > 1 ? 's' : ''}. Passez à un forfait supérieur pour en ajouter.`,
        'GERANTS_LIMIT_REACHED',
        422,
        { places },
      );
    }
  }

  verifierTelephoneLibre(telephone: string, saufUserId?: number): void {
    if (this.users.some((u) => u.telephone === telephone && u.id !== saufUserId)) {
      throw new ApiError('Ce numéro de téléphone est déjà utilisé par un autre compte.', 'PHONE_TAKEN', 422);
    }
  }

  motDePasseProvisoire(): string {
    return `CB-${Math.floor(100000 + Math.random() * 900000)}`;
  }
}

function roleFromJwt(token: string | null): Role | null {
  try {
    const claims = JSON.parse(atob(token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { user?: { role?: Role } };
    return claims.user?.role ?? null;
  } catch {
    return null;
  }
}
