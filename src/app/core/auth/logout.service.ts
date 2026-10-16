import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmService } from '../../shared/components/confirm/confirm.service';
import { AuthStore } from './auth.store';

/** Déconnexion après confirmation, puis retour à l'écran de connexion. */
@Injectable({ providedIn: 'root' })
export class LogoutService {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  async logout(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Se déconnecter ?',
      message: 'Vous devrez saisir à nouveau vos identifiants pour accéder à votre espace.',
      confirmLabel: 'Se déconnecter',
      cancelLabel: 'Annuler',
    });
    if (!ok) return;
    this.auth.logout();
    void this.router.navigateByUrl('/connexion');
  }
}
