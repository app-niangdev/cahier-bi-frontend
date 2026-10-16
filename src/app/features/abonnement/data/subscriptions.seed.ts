import { addDays, addMonths, todayIso } from '../../../core/utils/dates';
import { ESSAI_JOURS, ESSAI_PLAN_NAME, Subscription, SubscriptionPlan } from '../domain/subscription.model';

/** Les 4 forfaits du backend (SubscriptionPlanSeeder). */
export function seedPlans(): SubscriptionPlan[] {
  return [
    {
      id: 1,
      name: 'Gratuit',
      duration_months: 1,
      price: 0,
      currency: 'XOF',
      max_gerants_par_boutique: 1,
      description: 'Pour démarrer : 1 gérant par boutique.',
      is_active: true,
      position: 1,
    },
    {
      id: 2,
      name: 'Boutique',
      duration_months: 1,
      price: 3000,
      currency: 'XOF',
      max_gerants_par_boutique: 3,
      description: "Jusqu'à 3 gérants par boutique, rappels WhatsApp.",
      is_active: true,
      position: 2,
    },
    {
      id: 3,
      name: 'Boutique Pro',
      duration_months: 1,
      price: 7500,
      currency: 'XOF',
      max_gerants_par_boutique: 10,
      description: "Jusqu'à 10 gérants par boutique, pour les commerces en croissance.",
      is_active: true,
      position: 3,
    },
    {
      id: 4,
      name: 'Annuel',
      duration_months: 12,
      price: 75000,
      currency: 'XOF',
      max_gerants_par_boutique: null,
      description: 'Gérants illimités, 12 mois au meilleur prix.',
      is_active: true,
      position: 4,
    },
  ];
}

/**
 * Tenant 1 : essai à l'inscription puis forfait Boutique mois après mois (actif).
 * Tenant 2 : essai puis forfait Gratuit, expiré depuis quelques jours.
 */
export function seedSubscriptions(today = todayIso()): Subscription[] {
  const subs: Subscription[] = [];
  let id = 0;

  const essai1 = addDays(today, -240);
  subs.push({
    id: ++id,
    tenant_id: 1,
    subscription_plan_id: null,
    plan: ESSAI_PLAN_NAME,
    amount: 0,
    currency: 'XOF',
    starts_at: essai1,
    ends_at: addDays(essai1, ESSAI_JOURS - 1),
    notes: "Période d'essai offerte à l'inscription.",
  });
  // Périodes mensuelles consécutives jusqu'à la période en cours (fin dans ~20 jours)
  const debutCourant = addDays(today, -10);
  for (let mois = 7; mois >= 0; mois--) {
    const debut = addMonths(debutCourant, -mois);
    subs.push({
      id: ++id,
      tenant_id: 1,
      subscription_plan_id: 2,
      plan: 'Boutique',
      amount: 3000,
      currency: 'XOF',
      starts_at: debut,
      ends_at: addDays(addMonths(debut, 1), -1),
      notes: mois === 0 ? 'Payé par Wave' : null,
    });
  }

  const essai2 = addDays(today, -75);
  subs.push({
    id: ++id,
    tenant_id: 2,
    subscription_plan_id: null,
    plan: ESSAI_PLAN_NAME,
    amount: 0,
    currency: 'XOF',
    starts_at: essai2,
    ends_at: addDays(essai2, ESSAI_JOURS - 1),
    notes: "Période d'essai offerte à l'inscription.",
  });
  const gratuit = addDays(addMonths(addDays(today, -5), -1), 1);
  subs.push({
    id: id + 1,
    tenant_id: 2,
    subscription_plan_id: 1,
    plan: 'Gratuit',
    amount: 0,
    currency: 'XOF',
    starts_at: gratuit,
    ends_at: addDays(today, -5),
    notes: null,
  });

  return subs;
}
