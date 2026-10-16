import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BadgeComponent } from '../../../shared/components/badge.component';
import { CellDirective, DataTableComponent, TableColumn } from '../../../shared/components/data-table.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { MontantComponent } from '../../../shared/components/montant.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { Loadable } from '../../../shared/utils/loadable';
import { AdminDashboard } from '../domain/admin.models';
import { ADMIN_REPOSITORY } from '../domain/admin.repository';
import { AbonnementBadgeComponent } from './abonnement-badge.component';

/** GET /admin/dashboard */
@Component({
  selector: 'app-admin-dashboard-page',
  imports: [
    RouterLink,
    PageHeaderComponent,
    StatCardComponent,
    SkeletonComponent,
    ErrorStateComponent,
    DataTableComponent,
    CellDirective,
    BadgeComponent,
    MontantComponent,
    AbonnementBadgeComponent,
    DateFrPipe,
    FcfaPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Tableau de bord plateforme" subtitle="Vue d'ensemble de Cahier Bi" />

    @if (stats.initialLoading()) {
      <app-skeleton variant="stats" [rows]="4" />
    } @else if (stats.error()) {
      <app-error-state [message]="stats.error()" (retry)="stats.reload()" />
    } @else if (stats.data(); as s) {
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs">
        <app-stat-card label="Tenants" [value]="s.tenants.total" icon="building" tone="brand" [hint]="s.tenants.active + ' actifs'" />
        <app-stat-card
          label="Boutiques"
          [value]="s.boutiques"
          icon="store"
          tone="info"
          [hint]="s.sans_boutique ? s.sans_boutique + ' tenant(s) sans boutique' : 'Tous les tenants ont une boutique'"
        />
        <app-stat-card
          label="Abonnements actifs"
          [value]="s.subscriptions.active + s.subscriptions.expiring"
          icon="card"
          tone="ok"
          [hint]="s.subscriptions.expired + ' expiré(s) · ' + s.subscriptions.none + ' sans abonnement'"
        />
        <app-stat-card label="Encaissé ce mois" [value]="s.revenue_month | fcfa" icon="money" tone="warn" [hint]="s.dettes_month + ' dette(s) saisie(s) ce mois'" />
      </section>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <section class="card p-5 lg:col-span-2" aria-labelledby="attention-title">
          <div class="mb-4 flex items-center justify-between">
            <h2 id="attention-title" class="font-semibold text-ink-900">Abonnements à relancer</h2>
            <a routerLink="/admin/abonnements" class="link text-sm">Tous les abonnements</a>
          </div>
          @if (s.attention.length === 0) {
            <p class="text-sm text-ink-500">Aucun abonnement à relancer.</p>
          } @else {
            <ul class="divide-y divide-ink-100 text-sm">
              @for (a of s.attention; track a.tenant_id) {
                <li class="flex items-center justify-between gap-3 py-2">
                  <span>
                    <a [routerLink]="['/admin/tenants', a.tenant_id]" class="font-medium text-ink-900 hover:underline">{{ a.tenant_name }}</a>
                    @if (a.ends_at) {
                      <span class="block text-xs text-ink-500">{{ a.plan }} · fin le {{ a.ends_at | dateFr }}</span>
                    }
                  </span>
                  <app-abonnement-badge [statut]="a" />
                </li>
              }
            </ul>
          }
        </section>
        <section class="card p-5" aria-labelledby="raccourcis-title">
          <h2 id="raccourcis-title" class="mb-4 font-semibold text-ink-900">Comptes</h2>
          <dl class="mb-4 space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-ink-500">Propriétaires</dt><dd class="font-medium">{{ s.proprietaires }}</dd></div>
            <div class="flex justify-between"><dt class="text-ink-500">Gérants</dt><dd class="font-medium">{{ s.gerants }}</dd></div>
          </dl>
          <ul class="space-y-2 border-t border-ink-100 pt-4 text-sm">
            <li><a routerLink="/admin/boutiques" class="link">Créer une boutique pour un tenant</a></li>
            <li><a routerLink="/admin/abonnements" class="link">Ajouter un abonnement</a></li>
            <li><a routerLink="/admin/forfaits" class="link">Gérer les forfaits</a></li>
            <li><a routerLink="/admin/utilisateurs" class="link">Gérer les utilisateurs</a></li>
          </ul>
        </section>
      </div>

      <section class="mt-6" aria-labelledby="tenants-title">
        <h2 id="tenants-title" class="mb-3 font-semibold text-ink-900">Activité par tenant</h2>
        <app-data-table caption="Montants à récupérer et encaissés par tenant" [rows]="s.tenant_stats" [columns]="columns" [trackBy]="trackTenant">
          <ng-template appCell="tenant" let-t>
            <a [routerLink]="['/admin/tenants', t.tenant_id]" class="font-medium text-ink-900 hover:underline">{{ t.tenant_name }}</a>
            @if (!t.tenant_active) {
              <app-badge tone="danger" class="ml-2">Désactivé</app-badge>
            }
          </ng-template>
          <ng-template appCell="boutiques" let-t>{{ t.boutiques }}</ng-template>
          <ng-template appCell="a_recuperer" let-t><app-montant [value]="t.a_recuperer" tone="du" /></ng-template>
          <ng-template appCell="encaisse" let-t><app-montant [value]="t.encaisse" tone="paye" /></ng-template>
        </app-data-table>
      </section>
    }
  `,
})
export class AdminDashboardPage {
  private readonly repo = inject(ADMIN_REPOSITORY);
  protected readonly stats = new Loadable<AdminDashboard>();
  protected readonly columns: TableColumn[] = [
    { key: 'tenant', label: 'Tenant', mobile: 'title' },
    { key: 'boutiques', label: 'Boutiques', align: 'right' },
    { key: 'a_recuperer', label: 'À récupérer', align: 'right', mobile: 'value' },
    { key: 'encaisse', label: 'Encaissé', align: 'right' },
  ];
  protected readonly trackTenant = (t: AdminDashboard['tenant_stats'][number]) => t.tenant_id;

  constructor() {
    this.stats.load(() => this.repo.dashboard());
  }
}
