import { Tenant } from '../../tenants/domain/tenant.model';

/** Forfait (table `subscription_plans`). */
export interface SubscriptionPlan {
  id: number;
  name: string;
  duration_months: number;
  price: number;
  currency: string;
  /** null = illimité */
  max_gerants_par_boutique: number | null;
  description: string | null;
  is_active: boolean;
  position: number;
  /** Abonnements déjà enregistrés avec ce forfait (GET /subscription-plans/list) */
  subscriptions_count?: number;
}

export type SubscriptionPlanPayload = Omit<SubscriptionPlan, 'id' | 'subscriptions_count'>;

/** Période d'abonnement d'un tenant (table `subscriptions`). */
export interface Subscription {
  id: number;
  tenant_id: number;
  /** null pour la période d'essai */
  subscription_plan_id: number | null;
  /** Nom du forfait au moment de la souscription ('Essai' pour l'essai gratuit) */
  plan: string;
  amount: number;
  currency: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
}

export interface SubscriptionCreatePayload {
  tenant_id: number;
  subscription_plan_id: number;
  starts_at: string;
  notes: string | null;
}

/** État de l'abonnement d'un tenant (GET /manager/subscription). */
export interface AbonnementEtat {
  actif: boolean;
  courant: Subscription | null;
  forfait: SubscriptionPlan | null;
  en_essai: boolean;
  jours_restants: number;
  jours_essai_restants: number | null;
  max_gerants_par_boutique: number | null;
  historique: Subscription[];
}

/** Ligne de la vue d'ensemble admin (GET /subscriptions/overview). */
export interface AbonnementApercu {
  tenant: Tenant;
  etat: AbonnementEtat;
}

/** Offres publiques (GET /subscription-offers). */
export interface OffresAbonnement {
  forfaits: SubscriptionPlan[];
  essai_jours: number;
  contact_whatsapp: string;
}

export const ESSAI_JOURS = 14;
export const ESSAI_PLAN_NAME = 'Essai';
