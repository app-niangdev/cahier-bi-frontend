import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay, switchMap } from 'rxjs';
import { Role } from '../../../core/domain/enums';
import { API_URL, ApiEnvelope, ApiPage, fetchAll, payload } from '../../../core/http/api';
import { nationalNumber } from '../../../core/utils/telephone';
import {
  AdminBoutique,
  AdminDashboard,
  AdminSubscription,
  AdminTenant,
  AdminUser,
  BoutiquePayload,
  RoleRef,
  StatutAbonnement,
  SubscriptionPayload,
  TenantPayload,
  UserAcces,
  UserPayload,
} from '../domain/admin.models';
import {
  AdminBoutiqueRepository,
  AdminRepository,
  AdminSubscriptionRepository,
  AdminTenantRepository,
} from '../domain/admin.repository';

/** Lignes demandées par page pour les listes complètes. */
const PAGE_SIZE = 100;

/** Numéro saisi (« 77 123 45 67 », « +221… ») → 9 chiffres attendus par Laravel. */
function phone(value: string | null | undefined): string | null {
  if (!value) return null;
  return nationalNumber(value) ?? value;
}

function list<T>(http: HttpClient, url: string, params: Record<string, string> = {}): Observable<T[]> {
  return fetchAll((page) =>
    http.get<ApiPage<T>>(url, { params: new HttpParams({ fromObject: { ...params, page, per_page: PAGE_SIZE } }) }),
  );
}

const done = map(() => undefined);

/** Mot de passe provisoire communiqué à l'utilisateur (8 caractères minimum côté Laravel). */
function motDePasseProvisoire(): string {
  const chiffres = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return `CB-${String(chiffres).padStart(6, '0')}`;
}

@Injectable()
export class HttpAdminRepository implements AdminRepository {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);
  private roles$: Observable<RoleRef[]> | null = null;

  dashboard(): Observable<AdminDashboard> {
    return this.http.get<ApiEnvelope<AdminDashboard>>(`${this.api}/admin/dashboard`).pipe(payload());
  }

  roles(): Observable<RoleRef[]> {
    this.roles$ ??= this.http.get<ApiEnvelope<RoleRef[]>>(`${this.api}/roles/list`).pipe(payload(), shareReplay(1));
    return this.roles$;
  }

  users(): Observable<AdminUser[]> {
    return list<AdminUser>(this.http, `${this.api}/users/list`, { with_trashed: '1' });
  }

  createUser(p: UserPayload): Observable<UserAcces> {
    const password = motDePasseProvisoire();
    return this.body(p).pipe(
      switchMap((body) => this.http.post<ApiEnvelope<AdminUser>>(`${this.api}/users/add`, { ...body, password })),
      payload(),
      map((user) => ({ user, mot_de_passe_provisoire: password })),
    );
  }

  updateUser(id: number, p: UserPayload): Observable<AdminUser> {
    return this.body(p).pipe(
      switchMap((body) => this.http.put<ApiEnvelope<AdminUser>>(`${this.api}/users/update/${id}`, body)),
      payload(),
    );
  }

  toggleUser(id: number): Observable<AdminUser> {
    return this.http.put<ApiEnvelope<AdminUser>>(`${this.api}/users/toggle-status/${id}`, {}).pipe(payload());
  }

  resetUserAccess(id: number): Observable<UserAcces> {
    const password = motDePasseProvisoire();
    return this.http.post<ApiEnvelope<AdminUser>>(`${this.api}/users/reset-access/${id}`, { password }).pipe(
      payload(),
      map((user) => ({ user, mot_de_passe_provisoire: password })),
    );
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete(`${this.api}/users/disable/${id}`).pipe(done);
  }

  restoreUser(id: number): Observable<void> {
    return this.http.post(`${this.api}/users/restore/${id}`, {}).pipe(done);
  }

  /** Le backend attend role_id : résolu d'après le nom du rôle. */
  private body(p: UserPayload): Observable<Record<string, unknown>> {
    return this.roles().pipe(
      map((roles) => ({
        first_name: p.first_name.trim(),
        last_name: p.last_name.trim(),
        email: p.email?.trim().toLowerCase() || null,
        phone_one: phone(p.phone_one),
        phone_two: phone(p.phone_two),
        address: p.address?.trim() || null,
        role_id: roles.find((r) => r.name === p.role)?.id ?? null,
        tenant_id: p.role === Role.Proprietaire ? p.tenant_id : null,
        boutique_id: p.role === Role.Gerant ? p.boutique_id : null,
      })),
    );
  }
}

@Injectable()
export class HttpAdminTenantRepository implements AdminTenantRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL)}/tenants`;

  list(): Observable<AdminTenant[]> {
    return list<AdminTenant>(this.http, `${this.url}/list`, { with_trashed: '1' });
  }

  get(id: number): Observable<AdminTenant> {
    return this.http.get<ApiEnvelope<AdminTenant>>(`${this.url}/show/${id}`).pipe(payload());
  }

  create(p: TenantPayload): Observable<void> {
    return this.http.post(`${this.url}/add`, this.body(p)).pipe(done);
  }

  update(id: number, p: TenantPayload): Observable<void> {
    return this.http.put(`${this.url}/update/${id}`, this.body(p)).pipe(done);
  }

  toggleStatus(id: number): Observable<{ state: boolean }> {
    return this.http.put<ApiEnvelope<{ state: boolean }>>(`${this.url}/toggle-status/${id}`, {}).pipe(payload());
  }

  disable(id: number): Observable<void> {
    return this.http.delete(`${this.url}/disable/${id}`).pipe(done);
  }

  restore(id: number): Observable<void> {
    return this.http.post(`${this.url}/restore/${id}`, {}).pipe(done);
  }

  private body(p: TenantPayload): TenantPayload {
    return { ...p, phone_whatsapp: phone(p.phone_whatsapp), phone_call: phone(p.phone_call) };
  }
}

@Injectable()
export class HttpAdminBoutiqueRepository implements AdminBoutiqueRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL)}/boutiques`;

  list(): Observable<AdminBoutique[]> {
    return list<AdminBoutique>(this.http, `${this.url}/list`, { with_trashed: '1' });
  }

  create(p: BoutiquePayload): Observable<AdminBoutique> {
    return this.http
      .post<ApiEnvelope<AdminBoutique>>(`${this.url}/add`, { ...p, telephone: phone(p.telephone), whatsapp: phone(p.whatsapp) })
      .pipe(payload());
  }

  update(id: number, p: Omit<BoutiquePayload, 'tenant_id'>): Observable<AdminBoutique> {
    return this.http
      .put<ApiEnvelope<AdminBoutique>>(`${this.url}/update/${id}`, { ...p, telephone: phone(p.telephone), whatsapp: phone(p.whatsapp) })
      .pipe(payload());
  }

  delete(id: number): Observable<void> {
    return this.http.delete(`${this.url}/delete/${id}`).pipe(done);
  }

  restore(id: number): Observable<void> {
    return this.http.post(`${this.url}/restore/${id}`, {}).pipe(done);
  }
}

@Injectable()
export class HttpAdminSubscriptionRepository implements AdminSubscriptionRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL)}/subscriptions`;

  overview(): Observable<StatutAbonnement[]> {
    return list<StatutAbonnement>(this.http, `${this.url}/overview`);
  }

  history(tenantId: number): Observable<{ status: StatutAbonnement; subscriptions: AdminSubscription[] }> {
    return this.http
      .get<ApiEnvelope<{ status: StatutAbonnement; subscriptions: AdminSubscription[] }>>(`${this.url}/tenant/${tenantId}`)
      .pipe(payload());
  }

  add(p: SubscriptionPayload): Observable<AdminSubscription> {
    return this.http.post<ApiEnvelope<AdminSubscription>>(`${this.url}/add`, p).pipe(payload());
  }

  update(id: number, p: SubscriptionPayload): Observable<AdminSubscription> {
    return this.http.put<ApiEnvelope<AdminSubscription>>(`${this.url}/update/${id}`, p).pipe(payload());
  }

  delete(id: number): Observable<void> {
    return this.http.delete(`${this.url}/delete/${id}`).pipe(done);
  }
}
