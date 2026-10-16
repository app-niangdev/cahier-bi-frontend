import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/data/api-error';
import { ApiSimulator } from '../../../core/data/api-simulator';
import { InMemoryDb } from '../../../core/data/in-memory-db';
import { Role } from '../../../core/domain/enums';
import { Tenant, TenantProfilPayload } from '../domain/tenant.model';
import { TenantRepository } from '../domain/tenant.repository';

@Injectable()
export class InMemoryTenantRepository implements TenantRepository {
  private readonly db = inject(InMemoryDb);
  private readonly api = inject(ApiSimulator);

  list(): Observable<Tenant[]> {
    return this.api.request(() => {
      this.db.requireRole(Role.Admin);
      return [...this.db.tenants].sort((a, b) => b.created_at.localeCompare(a.created_at));
    });
  }

  get(id: number): Observable<Tenant> {
    return this.api.request(() => {
      const user = this.db.currentUser();
      if (user.role !== Role.Admin && user.tenant_id !== id) {
        throw new ApiError('Entreprise introuvable.', 'NOT_FOUND', 404);
      }
      return this.db.findOrFail(this.db.tenants, id, 'Entreprise');
    });
  }

  toggleStatus(id: number): Observable<Tenant> {
    return this.api.request(() => {
      this.db.requireRole(Role.Admin);
      const tenant = this.db.findOrFail(this.db.tenants, id, 'Entreprise');
      tenant.state = !tenant.state;
      return tenant;
    });
  }

  disable(id: number): Observable<Tenant> {
    return this.api.request(() => {
      this.db.requireRole(Role.Admin);
      const tenant = this.db.findOrFail(this.db.tenants, id, 'Entreprise');
      tenant.deleted_at = new Date().toISOString();
      return tenant;
    });
  }

  restore(id: number): Observable<Tenant> {
    return this.api.request(() => {
      this.db.requireRole(Role.Admin);
      const tenant = this.db.findOrFail(this.db.tenants, id, 'Entreprise');
      tenant.deleted_at = null;
      return tenant;
    });
  }

  updateProfil(id: number, payload: TenantProfilPayload): Observable<Tenant> {
    return this.api.request(() => {
      const user = this.db.requireRole(Role.Admin, Role.Proprietaire);
      if (user.role === Role.Proprietaire && user.tenant_id !== id) {
        throw new ApiError('Entreprise introuvable.', 'NOT_FOUND', 404);
      }
      const tenant = this.db.findOrFail(this.db.tenants, id, 'Entreprise');
      Object.assign(tenant, payload);
      return tenant;
    });
  }
}
