import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthStore } from '../../../core/auth/auth.store';
import { LogoutService } from '../../../core/auth/logout.service';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { TelephonePipe } from '../../../shared/pipes/telephone.pipe';
import { Loadable } from '../../../shared/utils/loadable';
import { OffresGridComponent } from '../../abonnement/presentation/offres-grid.component';
import { OffresAbonnement } from '../../abonnement/domain/subscription.model';
import { SUBSCRIPTION_PLAN_REPOSITORY } from '../../abonnement/domain/subscription.repository';

/** Équivalent du blocage par le middleware `subscription`. */
@Component({
  selector: 'app-subscription-expired-page',
  imports: [IconComponent, OffresGridComponent, SkeletonComponent, ErrorStateComponent, TelephonePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto max-w-5xl px-4 py-12">
      <div class="card mx-auto max-w-2xl p-6 text-center sm:p-8">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warn-100 text-warn-700">
          <app-icon name="clock" [size]="28" />
        </div>
        <h1 class="mt-4 text-2xl font-bold text-ink-900">Abonnement expiré</h1>
        <p class="mt-2 text-ink-600">
          L'abonnement de <strong>{{ auth.tenant()?.name ?? 'votre entreprise' }}</strong> est arrivé à échéance.
          Vos données sont conservées : renouvelez votre forfait pour retrouver l'accès à vos clients et à vos dettes.
        </p>
        @if (auth.isGerant()) {
          <p class="mt-2 text-sm text-ink-600">Prévenez le propriétaire de la boutique pour qu'il renouvelle l'abonnement.</p>
        }
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          @if (offres.data(); as data) {
            <a class="btn btn-primary" [href]="whatsappLink(data.contact_whatsapp)" target="_blank" rel="noopener">
              <app-icon name="message" [size]="18" /> Renouveler via WhatsApp
            </a>
          }
          <button type="button" class="btn btn-secondary" (click)="logout()">
            <app-icon name="logout" [size]="18" /> Se déconnecter
          </button>
        </div>
      </div>

      <section class="mt-10" aria-labelledby="forfaits-title">
        <h2 id="forfaits-title" class="mb-4 text-lg font-semibold text-ink-900">Forfaits disponibles</h2>
        @if (offres.initialLoading()) {
          <app-skeleton variant="stats" [rows]="4" />
        } @else if (offres.error()) {
          <app-error-state [message]="offres.error()" (retry)="offres.reload()" />
        } @else if (offres.data(); as data) {
          <app-offres-grid [forfaits]="data.forfaits" />
          <p class="mt-4 text-sm text-ink-600">Contact pour le paiement : {{ data.contact_whatsapp | telephone }}</p>
        }
      </section>
    </main>
  `,
})
export class SubscriptionExpiredPage {
  protected readonly auth = inject(AuthStore);
  private readonly logoutService = inject(LogoutService);
  private readonly repo = inject(SUBSCRIPTION_PLAN_REPOSITORY);
  protected readonly offres = new Loadable<OffresAbonnement>();

  constructor() {
    this.offres.load(() => this.repo.offers());
  }

  protected whatsappLink(numero: string): string {
    const message = encodeURIComponent(`Bonjour, je souhaite renouveler l'abonnement Cahier Bi de ${this.auth.tenant()?.name ?? 'mon entreprise'}.`);
    return `https://wa.me/${numero.replace(/\D/g, '')}?text=${message}`;
  }

  protected logout(): void {
    void this.logoutService.logout();
  }
}
