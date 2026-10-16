import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { BadgeComponent } from '../../../shared/components/badge.component';
import { ConfirmService } from '../../../shared/components/confirm/confirm.service';
import { CellDirective, DataTableComponent, TableColumn } from '../../../shared/components/data-table.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { FilterSelectComponent } from '../../../shared/components/filter-select.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { ModalComponent } from '../../../shared/components/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SearchInputComponent } from '../../../shared/components/search-input.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { formatTelephone } from '../../../core/utils/telephone';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { Loadable } from '../../../shared/utils/loadable';
import { AdminTenant } from '../domain/admin.models';
import { ADMIN_TENANT_REPOSITORY } from '../domain/admin.repository';
import { AbonnementBadgeComponent } from './abonnement-badge.component';
import { TenantFormComponent } from './tenant-form.component';

@Component({
  selector: 'app-admin-tenants-page',
  imports: [
    RouterLink,
    PageHeaderComponent,
    SearchInputComponent,
    FilterSelectComponent,
    DataTableComponent,
    CellDirective,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    ModalComponent,
    BadgeComponent,
    IconComponent,
    AbonnementBadgeComponent,
    TenantFormComponent,
    DateFrPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Tenants" subtitle="Comptes des propriétaires">
      <button type="button" class="btn btn-primary" (click)="ouvrir(null)"><app-icon name="plus" [size]="18" /> Nouveau tenant</button>
    </app-page-header>

    <div class="mb-4 grid gap-3 sm:grid-cols-[1fr_14rem]">
      <app-search-input label="Rechercher un tenant" placeholder="Nom, code, téléphone, e-mail…" [(value)]="recherche" />
      <app-filter-select label="Statut" allLabel="Tous les statuts" [options]="statuts" [(value)]="statut" />
    </div>

    @if (tenants.initialLoading()) {
      <app-skeleton [rows]="4" />
    } @else if (tenants.error()) {
      <app-error-state [message]="tenants.error()" (retry)="tenants.reload()" />
    } @else if (lignes().length === 0) {
      <div class="card"><app-empty-state icon="building" title="Aucun tenant" message="Aucun compte ne correspond à ces critères." /></div>
    } @else {
      <app-data-table caption="Liste des tenants" [rows]="lignes()" [columns]="columns" [dimmed]="estSupprime">
        <ng-template appCell="name" let-t>
          <a [routerLink]="['/admin/tenants', t.id]" class="font-medium text-ink-900 hover:underline">{{ t.name }}</a>
          <span class="block text-xs text-ink-500">{{ proprietaire(t) }}</span>
        </ng-template>
        <ng-template appCell="boutiques" let-t>{{ t.boutiques.length }} · {{ t.gerants_count }} gérant(s)</ng-template>
        <ng-template appCell="registered_at" let-t>{{ t.registered_at | dateFr }}</ng-template>
        <ng-template appCell="abonnement" let-t><app-abonnement-badge [statut]="t.subscription" /></ng-template>
        <ng-template appCell="state" let-t>
          @if (t.deleted_at) {
            <app-badge tone="neutral">Supprimé</app-badge>
          } @else if (t.approval_status === 'pending') {
            <app-badge tone="warn">Inscription en cours</app-badge>
          } @else {
            <app-badge [tone]="t.state ? 'ok' : 'danger'">{{ t.state ? 'Actif' : 'Désactivé' }}</app-badge>
          }
        </ng-template>
        <ng-template appCell="actions" let-t>
          <div class="flex flex-wrap justify-end gap-2">
            <a [routerLink]="['/admin/tenants', t.id]" class="btn btn-secondary btn-sm">Détail</a>
            @if (t.deleted_at) {
              <button type="button" class="btn btn-secondary btn-sm" [disabled]="action.pending()" (click)="restaurer(t)">Restaurer</button>
            } @else {
              <button type="button" class="btn btn-secondary btn-sm" (click)="ouvrir(t)" [attr.aria-label]="'Modifier ' + t.name">Modifier</button>
              <button type="button" class="btn btn-secondary btn-sm" [disabled]="action.pending()" (click)="basculer(t)">
                {{ t.state ? 'Désactiver' : 'Activer' }}
              </button>
              <button type="button" class="btn btn-secondary btn-sm text-danger-700" [disabled]="action.pending()" (click)="supprimer(t)">Supprimer</button>
            }
          </div>
        </ng-template>
      </app-data-table>
    }

    <app-modal [open]="formOpen()" [title]="edition() ? 'Modifier le tenant' : 'Nouveau tenant'" size="lg" (closed)="formOpen.set(false)">
      @if (formOpen()) {
        <app-tenant-form [tenant]="edition()" (saved)="enregistre()" (cancelled)="formOpen.set(false)" />
      }
    </app-modal>
  `,
})
export class AdminTenantsPage {
  private readonly repo = inject(ADMIN_TENANT_REPOSITORY);
  private readonly confirm = inject(ConfirmService);
  protected readonly action = new ActionRunner(inject(ToastService));

  protected readonly tenants = new Loadable<AdminTenant[]>();
  protected readonly recherche = signal('');
  protected readonly statut = signal('');
  protected readonly formOpen = signal(false);
  protected readonly edition = signal<AdminTenant | null>(null);
  protected readonly statuts = [
    { value: 'actif', label: 'Actifs' },
    { value: 'inactif', label: 'Désactivés' },
    { value: 'pending', label: 'Inscriptions en cours' },
    { value: 'supprime', label: 'Supprimés' },
  ];
  protected readonly columns: TableColumn[] = [
    { key: 'name', label: 'Tenant', mobile: 'title' },
    { key: 'boutiques', label: 'Boutiques' },
    { key: 'registered_at', label: 'Inscrit le' },
    { key: 'abonnement', label: 'Abonnement' },
    { key: 'state', label: 'Statut', mobile: 'value' },
    { key: 'actions', label: 'Actions', align: 'right', mobile: 'footer' },
  ];
  protected readonly estSupprime = (t: AdminTenant) => !!t.deleted_at;

  protected readonly lignes = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    const statut = this.statut();
    return (this.tenants.data() ?? [])
      .filter(
        (t) =>
          !q ||
          [t.name, t.code_website, t.email ?? '', t.phone_whatsapp ?? '', ...t.managers.map((m) => `${m.full_name} ${m.phone_one}`)].some((v) =>
            v.toLowerCase().includes(q),
          ),
      )
      .filter((t) => {
        if (statut === 'supprime') return !!t.deleted_at;
        if (statut === 'pending') return !t.deleted_at && t.approval_status === 'pending';
        if (statut === 'actif') return !t.deleted_at && t.state;
        if (statut === 'inactif') return !t.deleted_at && !t.state;
        return true;
      });
  });

  constructor() {
    this.tenants.load(() => this.repo.list());
  }

  protected proprietaire(t: AdminTenant): string {
    const m = t.managers[0];
    if (!m) return 'Aucun propriétaire';
    return `${m.full_name} · ${formatTelephone(m.phone_one)}`;
  }

  protected ouvrir(t: AdminTenant | null): void {
    this.edition.set(t);
    this.formOpen.set(true);
  }

  protected enregistre(): void {
    this.formOpen.set(false);
    this.tenants.reload(true);
  }

  protected async basculer(t: AdminTenant): Promise<void> {
    if (t.state) {
      const ok = await this.confirm.ask({
        title: `Désactiver ${t.name} ?`,
        message: 'Le propriétaire et ses gérants ne pourront plus accéder à leurs boutiques.',
        confirmLabel: 'Désactiver',
      });
      if (!ok) return;
    }
    this.run(this.repo.toggleStatus(t.id), (r) => `${t.name} est ${r.state ? 'activé' : 'désactivé'}.`);
  }

  protected async supprimer(t: AdminTenant): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Supprimer ${t.name} ?`,
      message: 'Le compte sera supprimé (récupérable : il pourra être restauré).',
      confirmLabel: 'Supprimer',
    });
    if (ok) this.run(this.repo.disable(t.id), () => 'Tenant supprimé.');
  }

  protected restaurer(t: AdminTenant): void {
    this.run(this.repo.restore(t.id), () => `${t.name} a été restauré.`);
  }

  private run<T>(source: Observable<T>, message: (r: T) => string): void {
    this.action.run(source, { success: message, onSuccess: () => this.tenants.reload(true) });
  }
}
