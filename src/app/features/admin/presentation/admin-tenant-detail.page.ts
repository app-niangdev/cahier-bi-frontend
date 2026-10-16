import { ChangeDetectionStrategy, Component, effect, inject, input, numberAttribute, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BOUTIQUE_STATUT_LABELS } from '../../../core/domain/enums';
import { BadgeComponent } from '../../../shared/components/badge.component';
import { ConfirmService } from '../../../shared/components/confirm/confirm.service';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { ModalComponent } from '../../../shared/components/modal.component';
import { MontantComponent } from '../../../shared/components/montant.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { TelephonePipe } from '../../../shared/pipes/telephone.pipe';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { Loadable } from '../../../shared/utils/loadable';
import { SubscriptionPlan } from '../../abonnement/domain/subscription.model';
import { SUBSCRIPTION_PLAN_REPOSITORY } from '../../abonnement/domain/subscription.repository';
import { AdminSubscription, AdminTenant, StatutAbonnement } from '../domain/admin.models';
import { ADMIN_SUBSCRIPTION_REPOSITORY, ADMIN_TENANT_REPOSITORY } from '../domain/admin.repository';
import { AbonnementBadgeComponent } from './abonnement-badge.component';
import { SubscriptionFormComponent } from './subscription-form.component';
import { TenantFormComponent } from './tenant-form.component';

interface Detail {
  tenant: AdminTenant;
  historique: { status: StatutAbonnement; subscriptions: AdminSubscription[] };
  plans: SubscriptionPlan[];
}

@Component({
  selector: 'app-admin-tenant-detail-page',
  imports: [
    RouterLink,
    PageHeaderComponent,
    SkeletonComponent,
    ErrorStateComponent,
    StatCardComponent,
    BadgeComponent,
    MontantComponent,
    IconComponent,
    ModalComponent,
    AbonnementBadgeComponent,
    SubscriptionFormComponent,
    TenantFormComponent,
    DateFrPipe,
    TelephonePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data.initialLoading()) {
      <app-page-header title="Tenant" backLink="/admin/tenants" backLabel="Tenants" />
      <app-skeleton variant="detail" />
    } @else if (data.error()) {
      <app-page-header title="Tenant" backLink="/admin/tenants" backLabel="Tenants" />
      <app-error-state [message]="data.error()" (retry)="data.reload()" />
    } @else if (data.data(); as d) {
      <app-page-header [title]="d.tenant.name" [subtitle]="d.tenant.trade" backLink="/admin/tenants" backLabel="Tenants">
        @if (d.tenant.deleted_at) {
          <button type="button" class="btn btn-primary" [disabled]="action.pending()" (click)="restaurer(d.tenant)"><app-icon name="undo" [size]="18" /> Restaurer</button>
        } @else {
          <button type="button" class="btn btn-secondary" (click)="editionTenant.set(true)"><app-icon name="edit" [size]="18" /> Modifier</button>
          <button type="button" class="btn btn-secondary" [disabled]="action.pending()" (click)="basculer(d.tenant)">
            <app-icon name="power" [size]="18" /> {{ d.tenant.state ? 'Désactiver' : 'Activer' }}
          </button>
          <button type="button" class="btn btn-primary" (click)="ouvrirAbonnement(null)"><app-icon name="plus" [size]="18" /> Abonnement</button>
        }
      </app-page-header>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Résumé">
        <app-stat-card
          label="Statut"
          [value]="d.tenant.deleted_at ? 'Supprimé' : d.tenant.state ? 'Actif' : 'Désactivé'"
          icon="shield"
          [tone]="d.tenant.state && !d.tenant.deleted_at ? 'ok' : 'danger'"
          [hint]="d.tenant.approval_status === 'pending' ? 'Inscription non confirmée' : null"
        />
        <app-stat-card
          label="Abonnement"
          [value]="d.historique.status.plan ?? 'Aucun'"
          icon="card"
          [tone]="d.historique.status.state === 'active' ? 'ok' : d.historique.status.state === 'expiring' ? 'warn' : 'danger'"
          [hint]="d.historique.status.ends_at ? 'jusqu’au ' + (d.historique.status.ends_at | dateFr) : null"
        />
        <app-stat-card label="Boutiques" [value]="d.tenant.boutiques.length" icon="store" tone="info" />
        <app-stat-card label="Gérants" [value]="d.tenant.gerants_count" icon="users" tone="neutral" />
      </section>

      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <section class="card p-5" aria-labelledby="infos-title">
          <h2 id="infos-title" class="mb-3 font-semibold text-ink-900">Informations</h2>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between gap-3"><dt class="text-ink-500">Code</dt><dd class="font-mono">{{ d.tenant.code_website }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ink-500">WhatsApp</dt><dd>{{ (d.tenant.phone_whatsapp | telephone) || '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ink-500">Téléphone</dt><dd>{{ (d.tenant.phone_call | telephone) || '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ink-500">E-mail</dt><dd>{{ d.tenant.email ?? '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ink-500">Adresse</dt><dd class="text-right">{{ d.tenant.address ?? '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ink-500">NINEA / RCCM</dt><dd>{{ d.tenant.ninea ?? '—' }} / {{ d.tenant.rccm ?? '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ink-500">Inscrit le</dt><dd>{{ d.tenant.registered_at | dateFr }}</dd></div>
          </dl>
        </section>

        <section class="card p-5" aria-labelledby="managers-title">
          <div class="mb-3 flex items-center justify-between">
            <h2 id="managers-title" class="font-semibold text-ink-900">Propriétaire</h2>
            <a routerLink="/admin/utilisateurs" class="link text-sm">Utilisateurs</a>
          </div>
          @if (d.tenant.managers.length === 0) {
            <p class="text-sm text-ink-500">Aucun compte propriétaire : créez-le dans Utilisateurs.</p>
          } @else {
            <ul class="divide-y divide-ink-100 text-sm">
              @for (m of d.tenant.managers; track m.id) {
                <li class="flex items-center justify-between gap-2 py-2">
                  <span>{{ m.full_name }} <span class="text-ink-500">· {{ m.phone_one | telephone }}</span></span>
                  <span class="flex gap-1">
                    @if (!m.phone_verified) {
                      <app-badge tone="warn">Numéro non confirmé</app-badge>
                    }
                    @if (!m.status) {
                      <app-badge tone="neutral">Désactivé</app-badge>
                    }
                  </span>
                </li>
              }
            </ul>
          }
        </section>

        <section class="card p-5" aria-labelledby="boutiques-title">
          <div class="mb-3 flex items-center justify-between">
            <h2 id="boutiques-title" class="font-semibold text-ink-900">Boutiques</h2>
            <a routerLink="/admin/boutiques" [queryParams]="{ tenant: d.tenant.id }" class="link text-sm">Gérer</a>
          </div>
          @if (d.tenant.boutiques.length === 0) {
            <p class="text-sm text-ink-500">Aucune boutique.</p>
          } @else {
            <ul class="divide-y divide-ink-100 text-sm">
              @for (b of d.tenant.boutiques; track b.id) {
                <li class="flex items-center justify-between py-2">
                  <span>{{ b.nom }} <span class="text-ink-500">· {{ lieu(b) }}</span></span>
                  <app-badge [tone]="b.statut === 'actif' ? 'ok' : 'warn'">{{ statutBoutique[b.statut] }}</app-badge>
                </li>
              }
            </ul>
          }
        </section>

        <section class="card p-5" aria-labelledby="subs-title">
          <div class="mb-3 flex items-center justify-between">
            <h2 id="subs-title" class="font-semibold text-ink-900">Historique des abonnements</h2>
            <app-abonnement-badge [statut]="d.historique.status" />
          </div>
          @if (d.historique.subscriptions.length === 0) {
            <p class="text-sm text-ink-500">Aucun abonnement.</p>
          } @else {
            <ul class="divide-y divide-ink-100 text-sm">
              @for (s of d.historique.subscriptions; track s.id) {
                <li class="flex items-center justify-between gap-2 py-2">
                  <span>
                    {{ s.plan }} <span class="text-ink-500">· {{ s.starts_at | dateFr }} → {{ s.ends_at | dateFr }}</span>
                    @if (s.notes) {
                      <span class="block text-xs text-ink-500">{{ s.notes }}</span>
                    }
                  </span>
                  <span class="flex items-center gap-2">
                    <app-montant [value]="s.amount" />
                    @if (!d.tenant.deleted_at) {
                      <button type="button" class="btn btn-secondary btn-sm" (click)="ouvrirAbonnement(s)" [attr.aria-label]="'Modifier ' + s.plan"><app-icon name="edit" [size]="14" /></button>
                      <button type="button" class="btn btn-secondary btn-sm text-danger-700" [disabled]="action.pending()" (click)="supprimerAbonnement(s)" [attr.aria-label]="'Supprimer ' + s.plan">
                        <app-icon name="trash" [size]="14" />
                      </button>
                    }
                  </span>
                </li>
              }
            </ul>
          }
        </section>
      </div>

      <app-modal [open]="editionTenant()" title="Modifier le tenant" size="lg" (closed)="editionTenant.set(false)">
        @if (editionTenant()) {
          <app-tenant-form [tenant]="d.tenant" (saved)="enregistre()" (cancelled)="editionTenant.set(false)" />
        }
      </app-modal>

      <app-modal [open]="abonnementOpen()" [title]="abonnement() ? 'Modifier l’abonnement' : 'Ajouter un abonnement'" (closed)="abonnementOpen.set(false)">
        @if (abonnementOpen()) {
          <app-subscription-form [tenants]="[d.historique.status]" [plans]="d.plans" [subscription]="abonnement()" (saved)="enregistre()" (cancelled)="abonnementOpen.set(false)" />
        }
      </app-modal>
    }
  `,
})
export class AdminTenantDetailPage {
  private readonly tenants = inject(ADMIN_TENANT_REPOSITORY);
  private readonly subs = inject(ADMIN_SUBSCRIPTION_REPOSITORY);
  private readonly plans = inject(SUBSCRIPTION_PLAN_REPOSITORY);
  private readonly confirm = inject(ConfirmService);
  protected readonly action = new ActionRunner(inject(ToastService));

  readonly id = input.required({ transform: numberAttribute });
  protected readonly data = new Loadable<Detail>();
  protected readonly statutBoutique = BOUTIQUE_STATUT_LABELS;
  protected readonly editionTenant = signal(false);
  protected readonly abonnementOpen = signal(false);
  protected readonly abonnement = signal<AdminSubscription | null>(null);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() =>
        this.data.load(() => forkJoin({ tenant: this.tenants.get(id), historique: this.subs.history(id), plans: this.plans.list() })),
      );
    });
  }

  protected lieu(b: { quartier: string | null; ville: string | null }): string {
    return [b.quartier, b.ville].filter((v) => !!v).join(', ') || '—';
  }

  protected enregistre(): void {
    this.editionTenant.set(false);
    this.abonnementOpen.set(false);
    this.data.reload(true);
  }

  protected ouvrirAbonnement(s: AdminSubscription | null): void {
    this.abonnement.set(s);
    this.abonnementOpen.set(true);
  }

  protected async supprimerAbonnement(s: AdminSubscription): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Supprimer l'abonnement ${s.plan} ?`,
      message: 'À utiliser pour corriger une erreur de saisie : la période ne couvrira plus le tenant.',
      confirmLabel: 'Supprimer',
    });
    if (ok) this.action.run(this.subs.delete(s.id), { success: 'Abonnement supprimé.', onSuccess: () => this.data.reload(true) });
  }

  protected async basculer(t: AdminTenant): Promise<void> {
    if (t.state) {
      const ok = await this.confirm.ask({ title: `Désactiver ${t.name} ?`, message: 'Le propriétaire et ses gérants perdront l’accès.', confirmLabel: 'Désactiver' });
      if (!ok) return;
    }
    this.action.run(this.tenants.toggleStatus(t.id), {
      success: (r) => `${t.name} est ${r.state ? 'activé' : 'désactivé'}.`,
      onSuccess: () => this.data.reload(true),
    });
  }

  protected restaurer(t: AdminTenant): void {
    this.action.run(this.tenants.restore(t.id), { success: `${t.name} a été restauré.`, onSuccess: () => this.data.reload(true) });
  }
}
