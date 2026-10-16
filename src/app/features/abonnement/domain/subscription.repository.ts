import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AbonnementApercu,
  AbonnementEtat,
  OffresAbonnement,
  Subscription,
  SubscriptionCreatePayload,
  SubscriptionPlan,
  SubscriptionPlanPayload,
} from './subscription.model';

/** Forfaits : /subscription-offers (public) et /subscription-plans/* (admin). */
export interface SubscriptionPlanRepository {
  offers(): Observable<OffresAbonnement>;
  list(): Observable<SubscriptionPlan[]>;
  create(payload: SubscriptionPlanPayload): Observable<SubscriptionPlan>;
  update(id: number, payload: SubscriptionPlanPayload): Observable<SubscriptionPlan>;
  toggleStatus(id: number): Observable<SubscriptionPlan>;
  delete(id: number): Observable<void>;
}

/** Abonnements : /manager/subscription et /subscriptions/* (admin). */
export interface SubscriptionRepository {
  etat(tenantId: number): Observable<AbonnementEtat>;
  overview(): Observable<AbonnementApercu[]>;
  add(payload: SubscriptionCreatePayload): Observable<Subscription>;
}

export const SUBSCRIPTION_PLAN_REPOSITORY = new InjectionToken<SubscriptionPlanRepository>(
  'SUBSCRIPTION_PLAN_REPOSITORY',
);
export const SUBSCRIPTION_REPOSITORY = new InjectionToken<SubscriptionRepository>('SUBSCRIPTION_REPOSITORY');
