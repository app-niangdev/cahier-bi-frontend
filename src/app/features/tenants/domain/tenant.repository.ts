import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Tenant, TenantProfilPayload } from './tenant.model';

/** Équivalent de /tenants/* (admin) et /manager/company (propriétaire). */
export interface TenantRepository {
  list(): Observable<Tenant[]>;
  get(id: number): Observable<Tenant>;
  toggleStatus(id: number): Observable<Tenant>;
  /** Suppression douce (DELETE /tenants/disable/{id}). */
  disable(id: number): Observable<Tenant>;
  restore(id: number): Observable<Tenant>;
  updateProfil(id: number, payload: TenantProfilPayload): Observable<Tenant>;
}

export const TENANT_REPOSITORY = new InjectionToken<TenantRepository>('TENANT_REPOSITORY');
