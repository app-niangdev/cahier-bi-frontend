import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_URL, ApiEnvelope, payload } from '../../../core/http/api';
import { OffresAbonnement, SubscriptionPlan, SubscriptionPlanPayload } from '../domain/subscription.model';
import { SubscriptionPlanRepository } from '../domain/subscription.repository';

/** GET /subscription-offers */
interface ApiOffers {
  plans: Omit<SubscriptionPlan, 'is_active' | 'position'>[];
  contact: { name: string; phone: string | null; whatsapp: string | null; payment_methods: string };
  trial_days: number;
}

/** Forfaits : offres publiques et gestion par l'administrateur (/subscription-plans/*). */
@Injectable()
export class HttpSubscriptionPlanRepository implements SubscriptionPlanRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);
  private readonly url = `${this.api}/subscription-plans`;

  offers(): Observable<OffresAbonnement> {
    return this.http.get<ApiEnvelope<ApiOffers>>(`${this.api}/subscription-offers`).pipe(
      payload(),
      map((o) => ({
        forfaits: o.plans.map((p, i) => ({ ...p, is_active: true, position: i + 1 })),
        essai_jours: o.trial_days,
        contact_whatsapp: o.contact.whatsapp ?? o.contact.phone ?? '',
      })),
    );
  }

  list(): Observable<SubscriptionPlan[]> {
    return this.http.get<ApiEnvelope<SubscriptionPlan[]>>(`${this.url}/list`).pipe(payload());
  }

  /** Créé actif : l'activation se change ensuite avec toggleStatus. */
  create(p: SubscriptionPlanPayload): Observable<SubscriptionPlan> {
    return this.http
      .post<ApiEnvelope<SubscriptionPlan>>(`${this.url}/add`, {
        name: p.name,
        duration_months: p.duration_months,
        price: p.price,
        currency: p.currency,
        max_gerants_par_boutique: p.max_gerants_par_boutique,
        description: p.description,
        position: p.position,
      })
      .pipe(payload());
  }

  /** Prix, durée et devise ne sont plus modifiables (refusés par l'API). */
  update(id: number, p: SubscriptionPlanPayload): Observable<SubscriptionPlan> {
    return this.http
      .put<ApiEnvelope<SubscriptionPlan>>(`${this.url}/update/${id}`, {
        name: p.name,
        max_gerants_par_boutique: p.max_gerants_par_boutique,
        description: p.description,
        position: p.position,
      })
      .pipe(payload());
  }

  toggleStatus(id: number): Observable<SubscriptionPlan> {
    return this.http.put<ApiEnvelope<SubscriptionPlan>>(`${this.url}/toggle-status/${id}`, {}).pipe(payload());
  }

  delete(id: number): Observable<void> {
    return this.http.delete(`${this.url}/delete/${id}`).pipe(map(() => undefined));
  }
}
