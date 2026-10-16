import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { IconComponent, IconName } from '../../../shared/components/icon.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { TelephonePipe } from '../../../shared/pipes/telephone.pipe';
import { Loadable } from '../../../shared/utils/loadable';
import { OffresGridComponent } from '../../abonnement/presentation/offres-grid.component';
import { OffresAbonnement } from '../../abonnement/domain/subscription.model';
import { SUBSCRIPTION_PLAN_REPOSITORY } from '../../abonnement/domain/subscription.repository';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, IconComponent, OffresGridComponent, SkeletonComponent, ErrorStateComponent, TelephonePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="border-b border-ink-200 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <a routerLink="/" class="flex items-center gap-2.5">
          <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white" aria-hidden="true">B</span>
          <span class="text-lg font-bold">Cahier Bi</span>
        </a>
        <nav class="flex items-center gap-2" aria-label="Accès">
          @if (auth.isAuthenticated()) {
            <a [routerLink]="auth.homeUrl()" class="btn btn-primary">Mon espace</a>
          } @else {
            <a routerLink="/connexion" class="btn btn-ghost">Connexion</a>
            <a routerLink="/inscription" class="btn btn-primary">Essai gratuit</a>
          }
        </nav>
      </div>
    </header>

    <main>
      <section class="bg-gradient-to-b from-brand-50 to-white">
        <div class="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p class="chip bg-brand-100 text-brand-800">Fait pour les boutiques du Sénégal</p>
            <h1 class="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">Le cahier de crédit de votre boutique, sur votre téléphone.</h1>
            <p class="mt-4 text-lg text-ink-600">
              Notez chaque achat à crédit, encaissez les versements en espèces, Wave ou Orange Money, et relancez vos clients sur WhatsApp. Fini les pages perdues.
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <a routerLink="/inscription" class="btn btn-primary px-6 py-3 text-base">Commencer l'essai de 14 jours</a>
              <a routerLink="/connexion" class="btn btn-secondary px-6 py-3 text-base">Voir la démo</a>
            </div>
          </div>
          <div class="card p-5" aria-hidden="true">
            <p class="text-sm font-medium text-ink-500">Total dû aujourd'hui</p>
            <p class="mt-1 text-3xl font-bold text-ink-900">1 245 500 FCFA</p>
            <div class="mt-5 space-y-3">
              @for (row of apercu; track row.nom) {
                <div class="flex items-center justify-between rounded-lg border border-ink-100 p-3">
                  <div>
                    <p class="text-sm font-semibold">{{ row.nom }}</p>
                    <p class="text-xs text-ink-500">{{ row.detail }}</p>
                  </div>
                  <span class="chip {{ row.classe }}">{{ row.statut }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-6xl px-4 py-14" aria-labelledby="atouts">
        <h2 id="atouts" class="text-2xl font-bold text-ink-900">Tout ce qu'il faut pour suivre vos crédits</h2>
        <ul class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          @for (f of fonctions; track f.titre) {
            <li class="card p-5">
              <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><app-icon [name]="f.icon" /></span>
              <h3 class="mt-4 font-semibold text-ink-900">{{ f.titre }}</h3>
              <p class="mt-1 text-sm text-ink-600">{{ f.texte }}</p>
            </li>
          }
        </ul>
      </section>

      <section class="border-t border-ink-200 bg-white" aria-labelledby="offres">
        <div class="mx-auto max-w-6xl px-4 py-14">
          <h2 id="offres" class="text-2xl font-bold text-ink-900">Nos offres</h2>
          <p class="mt-1 text-ink-600">Commencez par {{ offres.data()?.essai_jours ?? 14 }} jours d'essai gratuit, puis choisissez votre forfait.</p>
          <div class="mt-8">
            @if (offres.initialLoading()) {
              <app-skeleton variant="stats" [rows]="4" />
            } @else if (offres.error()) {
              <app-error-state [message]="offres.error()" (retry)="offres.reload()" />
            } @else if (offres.data(); as data) {
              <app-offres-grid [forfaits]="data.forfaits" [highlightId]="2" />
              <p class="mt-6 text-sm text-ink-600">
                Paiement par Wave ou Orange Money. Contact WhatsApp : <strong>{{ data.contact_whatsapp | telephone }}</strong>
              </p>
            }
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-ink-200 py-8 text-center text-sm text-ink-500">© {{ annee }} Cahier Bi · Dakar, Sénégal</footer>
  `,
})
export class LandingPage {
  protected readonly auth = inject(AuthStore);
  private readonly repo = inject(SUBSCRIPTION_PLAN_REPOSITORY);

  protected readonly annee = new Date().getFullYear();
  protected readonly offres = new Loadable<OffresAbonnement>();

  protected readonly apercu = [
    { nom: 'Moussa Ndiaye', detail: 'D-0042 · 35 000 FCFA', statut: 'En retard', classe: 'bg-statut-retard-bg text-statut-retard-fg' },
    { nom: 'Aminata Diallo', detail: 'D-0057 · 12 500 FCFA', statut: "Aujourd'hui", classe: 'bg-statut-aujourdhui-bg text-statut-aujourdhui-fg' },
    { nom: 'Abdoulaye Sow', detail: 'D-0061 · 8 000 FCFA', statut: 'Payée', classe: 'bg-statut-payee-bg text-statut-payee-fg' },
  ];

  protected readonly fonctions: { icon: IconName; titre: string; texte: string }[] = [
    { icon: 'book', titre: 'Dettes et échéances', texte: 'Chaque achat à crédit devient une dette avec sa date limite et son statut.' },
    { icon: 'wallet', titre: 'Versements', texte: 'Un versement global se répartit tout seul, de la dette la plus ancienne à la plus récente.' },
    { icon: 'bell', titre: 'Rappels WhatsApp', texte: 'Un message poli, normal ou ferme, prêt à envoyer en un clic.' },
    { icon: 'store', titre: 'Plusieurs boutiques', texte: 'Suivez chaque boutique et donnez un accès limité à vos gérants.' },
  ];

  constructor() {
    this.auth.restore().subscribe();
    this.offres.load(() => this.repo.offers());
  }
}
