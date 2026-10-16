import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CellDirective, DataTableComponent, TableColumn } from '../../../shared/components/data-table.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { FilterSelectComponent } from '../../../shared/components/filter-select.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { ModalComponent } from '../../../shared/components/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SearchInputComponent } from '../../../shared/components/search-input.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { Loadable } from '../../../shared/utils/loadable';
import { SubscriptionPlan } from '../../abonnement/domain/subscription.model';
import { SUBSCRIPTION_PLAN_REPOSITORY } from '../../abonnement/domain/subscription.repository';
import { toOptions } from '../../../core/domain/enums';
import { ETAT_ABONNEMENT_LABELS, EtatAbonnement, StatutAbonnement } from '../domain/admin.models';
import { ADMIN_SUBSCRIPTION_REPOSITORY } from '../domain/admin.repository';
import { AbonnementBadgeComponent } from './abonnement-badge.component';
import { SubscriptionFormComponent } from './subscription-form.component';

/** Vue d'ensemble des abonnements (GET /subscriptions/overview) et ajout d'une période. */
@Component({
  selector: 'app-admin-abonnements-page',
  imports: [
    RouterLink,
    PageHeaderComponent,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    StatCardComponent,
    DataTableComponent,
    CellDirective,
    SearchInputComponent,
    FilterSelectComponent,
    ModalComponent,
    IconComponent,
    AbonnementBadgeComponent,
    SubscriptionFormComponent,
    DateFrPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Abonnements" subtitle="Périodes d'abonnement des propriétaires">
      <button type="button" class="btn btn-primary" [disabled]="!data.data()" (click)="ouvrir(null)"><app-icon name="plus" [size]="18" /> Ajouter un abonnement</button>
    </app-page-header>

    @if (data.initialLoading()) {
      <app-skeleton variant="stats" [rows]="4" />
    } @else if (data.error()) {
      <app-error-state [message]="data.error()" (retry)="data.reload()" />
    } @else if (data.data(); as d) {
      <section class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Résumé">
        <app-stat-card label="Actifs" [value]="compte('active')" icon="check" tone="ok" />
        <app-stat-card label="Expirent bientôt" [value]="compte('expiring')" icon="clock" tone="warn" />
        <app-stat-card label="Expirés" [value]="compte('expired')" icon="alert" tone="danger" />
        <app-stat-card label="Sans abonnement" [value]="compte('none')" icon="ban" tone="neutral" />
      </section>

      <div class="mb-4 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <app-search-input label="Rechercher un tenant" placeholder="Nom du tenant…" [(value)]="recherche" />
        <app-filter-select label="État" allLabel="Tous les états" [options]="etats" [(value)]="filtre" />
      </div>

      @if (lignes().length === 0) {
        <div class="card"><app-empty-state icon="card" title="Aucun abonnement" message="Aucun tenant ne correspond à ces critères." /></div>
      } @else {
        <app-data-table caption="Abonnements par tenant" [rows]="lignes()" [columns]="columns" [trackBy]="trackTenant">
          <ng-template appCell="tenant" let-l>
            <a [routerLink]="['/admin/tenants', l.tenant_id]" class="font-medium text-ink-900 hover:underline">{{ l.tenant_name }}</a>
          </ng-template>
          <ng-template appCell="forfait" let-l>{{ l.plan ?? '—' }}</ng-template>
          <ng-template appCell="fin" let-l>
            @if (l.ends_at) {
              {{ l.ends_at | dateFr }}
              <span class="block text-xs text-ink-500">{{ joursLabel(l) }}</span>
            } @else {
              —
            }
          </ng-template>
          <ng-template appCell="statut" let-l><app-abonnement-badge [statut]="l" /></ng-template>
          <ng-template appCell="actions" let-l>
            <button type="button" class="btn btn-secondary btn-sm" (click)="ouvrir(l.tenant_id)" [attr.aria-label]="'Ajouter un abonnement à ' + l.tenant_name">
              <app-icon name="plus" [size]="14" /> Abonnement
            </button>
          </ng-template>
        </app-data-table>
      }

      <app-modal [open]="formOpen()" title="Ajouter un abonnement" (closed)="formOpen.set(false)">
        @if (formOpen()) {
          <app-subscription-form [tenants]="d.statuts" [tenantId]="tenantChoisi()" [plans]="d.plans" (saved)="enregistre()" (cancelled)="formOpen.set(false)" />
        }
      </app-modal>
    }
  `,
})
export class AdminAbonnementsPage {
  private readonly subs = inject(ADMIN_SUBSCRIPTION_REPOSITORY);
  private readonly plans = inject(SUBSCRIPTION_PLAN_REPOSITORY);

  /** ?tenant=2 : ouvre directement le formulaire pour ce tenant */
  readonly tenant = input<string | undefined>();

  protected readonly data = new Loadable<{ statuts: StatutAbonnement[]; plans: SubscriptionPlan[] }>();
  protected readonly formOpen = signal(false);
  protected readonly tenantChoisi = signal<number | null>(null);
  protected readonly recherche = signal('');
  protected readonly filtre = signal('');
  protected readonly etats = toOptions(ETAT_ABONNEMENT_LABELS);
  protected readonly columns: TableColumn[] = [
    { key: 'tenant', label: 'Tenant', mobile: 'title' },
    { key: 'forfait', label: 'Forfait' },
    { key: 'fin', label: 'Fin' },
    { key: 'statut', label: 'État', mobile: 'value' },
    { key: 'actions', label: 'Actions', align: 'right', mobile: 'footer' },
  ];
  protected readonly trackTenant = (s: StatutAbonnement) => s.tenant_id;

  protected readonly lignes = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    return (this.data.data()?.statuts ?? []).filter(
      (s) => (!this.filtre() || s.state === this.filtre()) && (!q || s.tenant_name.toLowerCase().includes(q)),
    );
  });

  constructor() {
    this.data.load(() => forkJoin({ statuts: this.subs.overview(), plans: this.plans.list() }));
    effect(() => {
      const t = this.tenant();
      const pret = !!this.data.data();
      if (t && pret) untracked(() => this.ouvrir(Number(t)));
    });
  }

  protected compte(etat: EtatAbonnement): number {
    return (this.data.data()?.statuts ?? []).filter((s) => s.state === etat).length;
  }

  protected joursLabel(s: StatutAbonnement): string {
    if (s.days_left === null) return '';
    return s.days_left >= 0 ? `${s.days_left} jour(s) restant(s)` : `Expiré depuis ${-s.days_left} jour(s)`;
  }

  protected ouvrir(tenantId: number | null): void {
    this.tenantChoisi.set(tenantId);
    this.formOpen.set(true);
  }

  protected enregistre(): void {
    this.formOpen.set(false);
    this.data.reload(true);
  }
}
