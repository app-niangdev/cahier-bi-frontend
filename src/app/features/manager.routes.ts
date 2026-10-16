import { Routes } from '@angular/router';
import { roleGuard } from '../core/auth/guards';
import { Role } from '../core/domain/enums';

/** Espace /app : propriétaire et gérant. */
export const MANAGER_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Tableau de bord',
    loadComponent: () => import('./dashboard/presentation/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'clients',
    title: 'Clients',
    loadComponent: () => import('./clients/presentation/client-list.page').then((m) => m.ClientListPage),
  },
  {
    path: 'clients/nouveau',
    title: 'Nouveau client',
    loadComponent: () => import('./clients/presentation/client-form.page').then((m) => m.ClientFormPage),
  },
  {
    path: 'clients/:id',
    title: 'Fiche client',
    loadComponent: () => import('./clients/presentation/client-detail.page').then((m) => m.ClientDetailPage),
  },
  {
    path: 'clients/:id/modifier',
    title: 'Modifier le client',
    loadComponent: () => import('./clients/presentation/client-form.page').then((m) => m.ClientFormPage),
  },
  {
    path: 'dettes',
    title: 'Dettes',
    loadComponent: () => import('./dettes/presentation/dette-list.page').then((m) => m.DetteListPage),
  },
  {
    path: 'dettes/nouvelle',
    title: 'Nouvelle dette',
    loadComponent: () => import('./dettes/presentation/dette-form.page').then((m) => m.DetteFormPage),
  },
  {
    path: 'dettes/:id',
    title: 'Détail de la dette',
    loadComponent: () => import('./dettes/presentation/dette-detail.page').then((m) => m.DetteDetailPage),
  },
  {
    path: 'dettes/:id/modifier',
    title: 'Modifier la dette',
    loadComponent: () => import('./dettes/presentation/dette-form.page').then((m) => m.DetteFormPage),
  },
  {
    path: 'versements',
    title: 'Versements',
    loadComponent: () => import('./paiements/presentation/versement-list.page').then((m) => m.VersementListPage),
  },
  {
    path: 'rappels',
    title: 'Rappels',
    loadComponent: () => import('./rappels/presentation/rappels.page').then((m) => m.RappelsPage),
  },
  {
    path: 'gerants',
    title: 'Gérants',
    canActivate: [roleGuard(Role.Proprietaire)],
    loadComponent: () => import('./gerants/presentation/gerants.page').then((m) => m.GerantsPage),
  },
  {
    path: 'entreprise',
    title: 'Mon entreprise',
    canActivate: [roleGuard(Role.Proprietaire)],
    loadComponent: () => import('./abonnement/presentation/entreprise.page').then((m) => m.EntreprisePage),
  },
  {
    path: 'profil',
    title: 'Mon profil',
    loadComponent: () => import('./profil/presentation/profil.page').then((m) => m.ProfilPage),
  },
];
