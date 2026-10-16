import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { HttpSubscriptionPlanRepository } from '../../features/abonnement/data/http-subscription-plan.repository';
import { InMemorySubscriptionRepository } from '../../features/abonnement/data/in-memory-subscription.repository';
import { SUBSCRIPTION_PLAN_REPOSITORY, SUBSCRIPTION_REPOSITORY } from '../../features/abonnement/domain/subscription.repository';
import {
  HttpAdminBoutiqueRepository,
  HttpAdminRepository,
  HttpAdminSubscriptionRepository,
  HttpAdminTenantRepository,
} from '../../features/admin/data/http-admin.repositories';
import {
  ADMIN_BOUTIQUE_REPOSITORY,
  ADMIN_REPOSITORY,
  ADMIN_SUBSCRIPTION_REPOSITORY,
  ADMIN_TENANT_REPOSITORY,
} from '../../features/admin/domain/admin.repository';
import { HttpAuthRepository } from '../../features/auth/data/http-auth.repository';
import { AUTH_REPOSITORY } from '../../features/auth/domain/auth.repository';
import { InMemoryBoutiqueRepository } from '../../features/boutiques/data/in-memory-boutique.repository';
import { BOUTIQUE_REPOSITORY } from '../../features/boutiques/domain/boutique.repository';
import { InMemoryClientRepository } from '../../features/clients/data/in-memory-client.repository';
import { CLIENT_REPOSITORY } from '../../features/clients/domain/client.repository';
import { InMemoryDashboardRepository } from '../../features/dashboard/data/in-memory-dashboard.repository';
import { DASHBOARD_REPOSITORY } from '../../features/dashboard/domain/dashboard.repository';
import { InMemoryDetteRepository } from '../../features/dettes/data/in-memory-dette.repository';
import { DETTE_REPOSITORY } from '../../features/dettes/domain/dette.repository';
import { InMemoryGerantRepository } from '../../features/gerants/data/in-memory-gerant.repository';
import { GERANT_REPOSITORY } from '../../features/gerants/domain/gerant.repository';
import { InMemoryVersementRepository } from '../../features/paiements/data/in-memory-versement.repository';
import { VERSEMENT_REPOSITORY } from '../../features/paiements/domain/versement.repository';
import { InMemoryRappelRepository } from '../../features/rappels/data/in-memory-rappel.repository';
import { RAPPEL_REPOSITORY } from '../../features/rappels/domain/rappel.repository';
import { InMemoryTenantRepository } from '../../features/tenants/data/in-memory-tenant.repository';
import { TENANT_REPOSITORY } from '../../features/tenants/domain/tenant.repository';

/**
 * Point unique de branchement des repositories.
 * API Laravel : authentification, espace administrateur et forfaits.
 * Espace propriétaire / gérant : encore en mémoire.
 * Pour passer au backend Laravel : remplacer `useClass: InMemoryXxxRepository`
 * par `useClass: HttpXxxRepository` (une ligne par feature), sans toucher aux écrans.
 */
export function repositoryProviders(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AUTH_REPOSITORY, useClass: HttpAuthRepository },
    { provide: TENANT_REPOSITORY, useClass: InMemoryTenantRepository },
    { provide: BOUTIQUE_REPOSITORY, useClass: InMemoryBoutiqueRepository },
    { provide: CLIENT_REPOSITORY, useClass: InMemoryClientRepository },
    { provide: DETTE_REPOSITORY, useClass: InMemoryDetteRepository },
    { provide: VERSEMENT_REPOSITORY, useClass: InMemoryVersementRepository },
    { provide: RAPPEL_REPOSITORY, useClass: InMemoryRappelRepository },
    { provide: GERANT_REPOSITORY, useClass: InMemoryGerantRepository },
    { provide: DASHBOARD_REPOSITORY, useClass: InMemoryDashboardRepository },
    { provide: SUBSCRIPTION_PLAN_REPOSITORY, useClass: HttpSubscriptionPlanRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useClass: InMemorySubscriptionRepository },
    // Administration
    { provide: ADMIN_REPOSITORY, useClass: HttpAdminRepository },
    { provide: ADMIN_TENANT_REPOSITORY, useClass: HttpAdminTenantRepository },
    { provide: ADMIN_BOUTIQUE_REPOSITORY, useClass: HttpAdminBoutiqueRepository },
    { provide: ADMIN_SUBSCRIPTION_REPOSITORY, useClass: HttpAdminSubscriptionRepository },
  ]);
}
