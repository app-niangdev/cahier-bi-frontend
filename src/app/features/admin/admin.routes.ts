import { Routes } from '@angular/router';

/** Espace /admin : administrateur de la plateforme. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Tableau de bord plateforme',
    loadComponent: () => import('./presentation/admin-dashboard.page').then((m) => m.AdminDashboardPage),
  },
  {
    path: 'tenants',
    title: 'Tenants',
    loadComponent: () => import('./presentation/admin-tenants.page').then((m) => m.AdminTenantsPage),
  },
  {
    path: 'tenants/:id',
    title: 'Détail du tenant',
    loadComponent: () => import('./presentation/admin-tenant-detail.page').then((m) => m.AdminTenantDetailPage),
  },
  {
    path: 'boutiques',
    title: 'Boutiques',
    loadComponent: () => import('./presentation/admin-boutiques.page').then((m) => m.AdminBoutiquesPage),
  },
  {
    path: 'forfaits',
    title: 'Forfaits',
    loadComponent: () => import('./presentation/admin-forfaits.page').then((m) => m.AdminForfaitsPage),
  },
  {
    path: 'abonnements',
    title: 'Abonnements',
    loadComponent: () => import('./presentation/admin-abonnements.page').then((m) => m.AdminAbonnementsPage),
  },
  {
    path: 'utilisateurs',
    title: 'Utilisateurs',
    loadComponent: () => import('./presentation/admin-utilisateurs.page').then((m) => m.AdminUtilisateursPage),
  },
  {
    path: 'profil',
    title: 'Mon profil',
    loadComponent: () => import('../profil/presentation/profil.page').then((m) => m.ProfilPage),
  },
];
