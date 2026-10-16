import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard, subscriptionGuard } from './core/auth/guards';
import { Role } from './core/domain/enums';

export const routes: Routes = [
  // ------------------------------------------------------------------ Public
  {
    path: '',
    pathMatch: 'full',
    title: 'Accueil',
    loadComponent: () => import('./features/public/presentation/landing.page').then((m) => m.LandingPage),
  },
  {
    path: 'connexion',
    title: 'Connexion',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/presentation/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'inscription',
    title: 'Inscription',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/presentation/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'mot-de-passe-oublie',
    title: 'Mot de passe oublié',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/presentation/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'abonnement-expire',
    title: 'Abonnement expiré',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/public/presentation/subscription-expired.page').then((m) => m.SubscriptionExpiredPage),
  },

  // ------------------------------------------------------------------ Propriétaire / Gérant
  {
    path: 'app',
    canActivate: [roleGuard(Role.Proprietaire, Role.Gerant), subscriptionGuard],
    loadComponent: () => import('./core/layout/shell.component').then((m) => m.ShellComponent),
    data: { space: 'app' },
    loadChildren: () => import('./features/manager.routes').then((m) => m.MANAGER_ROUTES),
  },

  // ------------------------------------------------------------------ Administration
  {
    path: 'admin',
    canActivate: [roleGuard(Role.Admin)],
    loadComponent: () => import('./core/layout/shell.component').then((m) => m.ShellComponent),
    data: { space: 'admin' },
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  {
    path: '**',
    title: 'Page introuvable',
    loadComponent: () => import('./features/public/presentation/not-found.page').then((m) => m.NotFoundPage),
  },
];
