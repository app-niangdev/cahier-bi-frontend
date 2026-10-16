import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { NoBoutiqueComponent } from '../../../core/boutique/no-boutique.component';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { BarChartComponent, ChartPoint, ChartSerie } from '../../../shared/components/bar-chart.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { MontantComponent } from '../../../shared/components/montant.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { MethodePaiementPipe } from '../../../shared/pipes/methode-paiement.pipe';
import { DashboardStore } from './dashboard.store';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    PageHeaderComponent,
    StatCardComponent,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    BarChartComponent,
    MontantComponent,
    AvatarComponent,
    IconComponent,
    NoBoutiqueComponent,
    FcfaPipe,
    DateFrPipe,
    MethodePaiementPipe,
  ],
  providers: [DashboardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Tableau de bord" [subtitle]="'Bonjour ' + prenom() + ' · ' + (aujourdhui | dateFr: 'long')">
      <a routerLink="/app/dettes/nouvelle" class="btn btn-primary"><app-icon name="plus" [size]="18" /> Nouvelle dette</a>
      <a routerLink="/app/clients/nouveau" class="btn btn-secondary"><app-icon name="users" [size]="18" /> Nouveau client</a>
    </app-page-header>

    @if (!ctx.current()) {
      <app-no-boutique />
    } @else if (store.stats.initialLoading()) {
      <app-skeleton variant="stats" [rows]="4" />
      <div class="mt-6"><app-skeleton [rows]="4" /></div>
    } @else if (store.stats.error()) {
      <app-error-state [message]="store.stats.error()" (retry)="store.stats.reload()" />
    } @else if (store.stats.data(); as s) {
      <section aria-label="Indicateurs" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Total dû" [value]="s.total_du | fcfa" icon="book" tone="brand" [hint]="s.nb_clients + ' clients'" />
        <app-stat-card label="Encaissé ce mois" [value]="s.encaisse_mois | fcfa" icon="wallet" tone="ok" />
        <app-stat-card label="Dettes en retard" [value]="s.nb_dettes_en_retard" icon="alert" tone="danger" [hint]="(s.montant_en_retard | fcfa) + ' à recouvrer'" />
        <app-stat-card label="Échues aujourd'hui" [value]="s.nb_dettes_aujourdhui" icon="calendar" tone="warn" [hint]="s.montant_aujourdhui | fcfa" />
      </section>

      <div class="mt-6 grid gap-6 lg:grid-cols-5">
        <section class="card p-5 lg:col-span-3" aria-labelledby="evolution-title">
          <h2 id="evolution-title" class="mb-4 font-semibold text-ink-900">Crédits accordés et encaissements (6 mois)</h2>
          <app-bar-chart [points]="chartPoints()" [series]="series" caption="Crédits accordés et montants encaissés par mois" />
        </section>

        <section class="card p-5 lg:col-span-2" aria-labelledby="top-title">
          <div class="mb-4 flex items-center justify-between">
            <h2 id="top-title" class="font-semibold text-ink-900">Top clients débiteurs</h2>
            <a routerLink="/app/clients" class="link text-sm">Tous les clients</a>
          </div>
          @if (s.top_debiteurs.length === 0) {
            <app-empty-state icon="check" title="Aucun débiteur" message="Toutes les dettes sont réglées." />
          } @else {
            <ol class="space-y-3">
              @for (c of s.top_debiteurs; track c.client_id; let i = $index) {
                <li>
                  <a [routerLink]="['/app/clients', c.client_id]" class="flex items-center gap-3 rounded-lg p-1 hover:bg-ink-50">
                    <span class="w-4 text-sm font-semibold text-ink-400">{{ i + 1 }}</span>
                    <app-avatar [name]="c.nom" [size]="34" />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium text-ink-900">{{ c.nom }}</span>
                      <span class="block text-xs text-ink-500">{{ c.nb_dettes }} dette{{ c.nb_dettes > 1 ? 's' : '' }} ouverte{{ c.nb_dettes > 1 ? 's' : '' }}</span>
                    </span>
                    <app-montant [value]="c.total_du" tone="du" [strong]="true" class="text-sm" />
                  </a>
                </li>
              }
            </ol>
          }
        </section>
      </div>

      <section class="card mt-6 p-5" aria-labelledby="paiements-title">
        <div class="mb-4 flex items-center justify-between">
          <h2 id="paiements-title" class="font-semibold text-ink-900">Derniers paiements</h2>
          <a routerLink="/app/versements" class="link text-sm">Tous les versements</a>
        </div>
        @if (s.derniers_versements.length === 0) {
          <app-empty-state icon="wallet" title="Aucun paiement" message="Les versements encaissés apparaîtront ici." />
        } @else {
          <ul class="divide-y divide-ink-100">
            @for (v of s.derniers_versements; track v.versement) {
              <li class="flex items-center gap-3 py-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-full bg-ok-100 text-ok-700"><app-icon name="wallet" [size]="18" /></span>
                <div class="min-w-0 flex-1">
                  <a [routerLink]="['/app/clients', v.client_id]" class="block truncate text-sm font-medium text-ink-900 hover:underline">{{ v.client_nom }}</a>
                  <p class="text-xs text-ink-500">
                    {{ v.date_paiement | dateFr }} · {{ v.methode | methodePaiement }}
                    @if (v.lignes.length > 1) {
                      · réparti sur {{ v.lignes.length }} dettes
                    }
                  </p>
                </div>
                <app-montant [value]="v.montant" tone="paye" [strong]="true" class="text-sm" />
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
})
export class DashboardPage {
  protected readonly store = inject(DashboardStore);
  protected readonly ctx = inject(BoutiqueContextStore);
  private readonly auth = inject(AuthStore);

  protected readonly aujourdhui = new Date().toISOString();
  protected readonly prenom = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');
  protected readonly series: ChartSerie[] = [
    { name: 'Crédits accordés', color: 'bg-ink-300' },
    { name: 'Encaissé', color: 'bg-brand-600' },
  ];
  protected readonly chartPoints = computed<ChartPoint[]>(() =>
    (this.store.stats.data()?.evolution ?? []).map((p) => ({ label: p.label, values: [p.credit, p.encaisse] })),
  );
}
