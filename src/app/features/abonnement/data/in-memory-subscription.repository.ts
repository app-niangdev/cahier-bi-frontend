import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/data/api-error';
import { ApiSimulator } from '../../../core/data/api-simulator';
import { InMemoryDb } from '../../../core/data/in-memory-db';
import { Role } from '../../../core/domain/enums';
import { addDays, addMonths } from '../../../core/utils/dates';
import {
  AbonnementApercu,
  AbonnementEtat,
  Subscription,
  SubscriptionCreatePayload,
} from '../domain/subscription.model';
import { SubscriptionRepository } from '../domain/subscription.repository';

@Injectable()
export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private readonly db = inject(InMemoryDb);
  private readonly api = inject(ApiSimulator);

  etat(tenantId: number): Observable<AbonnementEtat> {
    return this.api.request(() => {
      const user = this.db.currentUser();
      if (user.role !== Role.Admin && user.tenant_id !== tenantId) {
        throw new ApiError('Entreprise introuvable.', 'NOT_FOUND', 404);
      }
      return this.db.abonnementEtat(tenantId);
    });
  }

  overview(): Observable<AbonnementApercu[]> {
    return this.api.request(() => {
      this.db.requireRole(Role.Admin);
      return this.db.tenants.map((tenant) => ({ tenant, etat: this.db.abonnementEtat(tenant.id) }));
    });
  }

  /**
   * Ajout d'une période : montant et date de fin déduits du forfait.
   * Si une période est en cours, la nouvelle commence à sa suite.
   */
  add(payload: SubscriptionCreatePayload): Observable<Subscription> {
    return this.api.request(() => {
      this.db.requireRole(Role.Admin);
      this.db.findOrFail(this.db.tenants, payload.tenant_id, 'Entreprise');
      const plan = this.db.findOrFail(this.db.plans, payload.subscription_plan_id, 'Forfait');
      if (!plan.is_active) throw new ApiError('Ce forfait est désactivé.', 'PLAN_INACTIVE', 422);

      const derniere = this.db.subscriptions
        .filter((s) => s.tenant_id === payload.tenant_id)
        .reduce<string | null>((max, s) => (max === null || s.ends_at > max ? s.ends_at : max), null);
      let debut = payload.starts_at || this.db.today;
      if (derniere && derniere >= debut) debut = addDays(derniere, 1);

      const subscription: Subscription = {
        id: this.db.nextId(this.db.subscriptions),
        tenant_id: payload.tenant_id,
        subscription_plan_id: plan.id,
        plan: plan.name,
        amount: plan.price,
        currency: plan.currency,
        starts_at: debut,
        ends_at: addDays(addMonths(debut, plan.duration_months), -1),
        notes: payload.notes?.trim() || null,
      };
      this.db.subscriptions.push(subscription);
      return subscription;
    });
  }
}
