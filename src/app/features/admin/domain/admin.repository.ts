import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
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
} from './admin.models';

/** /admin/dashboard, /users/*, /roles/list */
export interface AdminRepository {
  dashboard(): Observable<AdminDashboard>;
  roles(): Observable<RoleRef[]>;
  /** Comptes supprimés compris. */
  users(): Observable<AdminUser[]>;
  createUser(payload: UserPayload): Observable<UserAcces>;
  updateUser(id: number, payload: UserPayload): Observable<AdminUser>;
  toggleUser(id: number): Observable<AdminUser>;
  resetUserAccess(id: number): Observable<UserAcces>;
  deleteUser(id: number): Observable<void>;
  restoreUser(id: number): Observable<void>;
}

/** /tenants/* */
export interface AdminTenantRepository {
  /** Comptes supprimés compris. */
  list(): Observable<AdminTenant[]>;
  get(id: number): Observable<AdminTenant>;
  create(payload: TenantPayload): Observable<void>;
  update(id: number, payload: TenantPayload): Observable<void>;
  toggleStatus(id: number): Observable<{ state: boolean }>;
  disable(id: number): Observable<void>;
  restore(id: number): Observable<void>;
}

/** /boutiques/* */
export interface AdminBoutiqueRepository {
  /** Boutiques supprimées comprises. */
  list(): Observable<AdminBoutique[]>;
  create(payload: BoutiquePayload): Observable<AdminBoutique>;
  update(id: number, payload: Omit<BoutiquePayload, 'tenant_id'>): Observable<AdminBoutique>;
  delete(id: number): Observable<void>;
  restore(id: number): Observable<void>;
}

/** /subscriptions/* */
export interface AdminSubscriptionRepository {
  overview(): Observable<StatutAbonnement[]>;
  history(tenantId: number): Observable<{ status: StatutAbonnement; subscriptions: AdminSubscription[] }>;
  add(payload: SubscriptionPayload): Observable<AdminSubscription>;
  update(id: number, payload: SubscriptionPayload): Observable<AdminSubscription>;
  delete(id: number): Observable<void>;
}

export const ADMIN_REPOSITORY = new InjectionToken<AdminRepository>('ADMIN_REPOSITORY');
export const ADMIN_TENANT_REPOSITORY = new InjectionToken<AdminTenantRepository>('ADMIN_TENANT_REPOSITORY');
export const ADMIN_BOUTIQUE_REPOSITORY = new InjectionToken<AdminBoutiqueRepository>('ADMIN_BOUTIQUE_REPOSITORY');
export const ADMIN_SUBSCRIPTION_REPOSITORY = new InjectionToken<AdminSubscriptionRepository>('ADMIN_SUBSCRIPTION_REPOSITORY');
