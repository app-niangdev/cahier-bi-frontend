import { BoutiqueStatut, Role } from '../../../core/domain/enums';

/** État calculé par SubscriptionService::statusForTenant(). */
export type EtatAbonnement = 'active' | 'expiring' | 'expired' | 'none';

export const ETAT_ABONNEMENT_LABELS: Record<EtatAbonnement, string> = {
  active: 'Actif',
  expiring: 'Expire bientôt',
  expired: 'Expiré',
  none: 'Sans abonnement',
};

export interface StatutAbonnement {
  tenant_id: number;
  tenant_name: string;
  state: EtatAbonnement;
  /** Forfait courant (ou dernier échu) ; « Essai » pour la période offerte */
  plan: string | null;
  starts_at: string | null;
  ends_at: string | null;
  /** Négatif une fois expiré */
  days_left: number | null;
  tenant_active?: boolean;
}

export type ApprovalStatus = 'approved' | 'pending';

/** Ligne de GET /tenants/list et /tenants/show/{id}. */
export interface AdminTenant {
  id: number;
  name: string;
  short_name: string | null;
  code_website: string;
  email: string | null;
  phone_call: string | null;
  phone_whatsapp: string | null;
  address: string | null;
  trade: string | null;
  ninea: string | null;
  rccm: string | null;
  slogan: string | null;
  logo_url: string | null;
  state: boolean;
  approval_status: ApprovalStatus;
  managers: {
    id: number;
    full_name: string;
    phone_one: string;
    email: string | null;
    status: boolean;
    phone_verified: boolean;
  }[];
  boutiques: { id: number; nom: string; ville: string | null; quartier: string | null; statut: BoutiqueStatut }[];
  gerants_count: number;
  subscription: StatutAbonnement;
  registered_at: string | null;
  deleted_at: string | null;
}

/** POST /tenants/add, /tenants/update/{id} */
export interface TenantPayload {
  name: string;
  code_website: string;
  short_name: string | null;
  email: string | null;
  phone_whatsapp: string | null;
  phone_call: string | null;
  address: string | null;
  trade: string | null;
  ninea: string | null;
  rccm: string | null;
}

/** Ligne de GET /boutiques/list */
export interface AdminBoutique {
  id: number;
  tenant_id: number;
  nom: string;
  slug: string;
  telephone: string | null;
  whatsapp: string | null;
  adresse: string | null;
  quartier: string | null;
  ville: string | null;
  logo_url: string | null;
  statut: BoutiqueStatut;
  tenant: { id: number; name: string } | null;
  gerants_count?: number;
  deleted_at: string | null;
}

export interface BoutiquePayload {
  tenant_id: number;
  nom: string;
  telephone: string | null;
  whatsapp: string | null;
  adresse: string | null;
  quartier: string | null;
  ville: string | null;
  statut: BoutiqueStatut;
}

export interface RoleRef {
  id: number;
  name: Role;
  label: string | null;
}

/** Ligne de GET /users/list */
export interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone_one: string;
  phone_two: string | null;
  address: string | null;
  status: boolean;
  must_change_password: boolean;
  phone_verified_at: string | null;
  role: RoleRef | null;
  tenant_id: number | null;
  boutique_id: number | null;
  tenant: { id: number; name: string } | null;
  boutique: { id: number; nom: string } | null;
  deleted_at: string | null;
}

export interface UserPayload {
  first_name: string;
  last_name: string;
  email: string | null;
  phone_one: string;
  phone_two: string | null;
  address: string | null;
  role: Role;
  tenant_id: number | null;
  boutique_id: number | null;
}

/** Compte créé ou accès réinitialisé : mot de passe provisoire à communiquer. */
export interface UserAcces {
  user: AdminUser;
  mot_de_passe_provisoire: string;
}

/** GET /admin/dashboard */
export interface AdminDashboard {
  tenants: { total: number; active: number };
  proprietaires: number;
  gerants: number;
  boutiques: number;
  sans_boutique: number;
  subscriptions: Record<EtatAbonnement, number>;
  revenue_month: number;
  dettes_month: number;
  attention: StatutAbonnement[];
  tenant_stats: {
    tenant_id: number;
    tenant_name: string;
    tenant_active: boolean;
    boutiques: number;
    a_recuperer: number;
    encaisse: number;
  }[];
}

/** Abonnement enregistré (table `subscriptions`). */
export interface AdminSubscription {
  id: number;
  tenant_id: number;
  subscription_plan_id: number | null;
  plan: string;
  amount: number;
  currency: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
}

export interface SubscriptionPayload {
  tenant_id: number;
  /** null : période sans forfait (essai), dates saisies */
  subscription_plan_id: number | null;
  starts_at: string;
  ends_at?: string | null;
  notes: string | null;
}
