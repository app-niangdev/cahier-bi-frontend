import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { formatTelephone, normalizeTelephone, telephoneSnValidator } from '../../../core/utils/telephone';
import { BadgeComponent } from '../../../shared/components/badge.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { MontantComponent } from '../../../shared/components/montant.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TelephoneInputDirective } from '../../../shared/directives/telephone-input.directive';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { TelephonePipe } from '../../../shared/pipes/telephone.pipe';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { Loadable } from '../../../shared/utils/loadable';
import { Tenant } from '../../tenants/domain/tenant.model';
import { TENANT_REPOSITORY } from '../../tenants/domain/tenant.repository';
import { AbonnementEtat, OffresAbonnement } from '../domain/subscription.model';
import { SUBSCRIPTION_PLAN_REPOSITORY, SUBSCRIPTION_REPOSITORY } from '../domain/subscription.repository';
import { OffresGridComponent } from './offres-grid.component';

interface Entreprise {
  tenant: Tenant;
  etat: AbonnementEtat;
  offres: OffresAbonnement;
}

/** Mon entreprise / Abonnement (propriétaire). */
@Component({
  selector: 'app-entreprise-page',
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SkeletonComponent,
    ErrorStateComponent,
    StatCardComponent,
    BadgeComponent,
    MontantComponent,
    IconComponent,
    OffresGridComponent,
    TelephoneInputDirective,
    DateFrPipe,
    TelephonePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Mon entreprise" subtitle="Profil de votre compte et abonnement" />

    @if (data.initialLoading()) {
      <app-skeleton variant="stats" [rows]="4" />
      <div class="mt-6"><app-skeleton variant="detail" /></div>
    } @else if (data.error()) {
      <app-error-state [message]="data.error()" (retry)="data.reload()" />
    } @else if (data.data(); as d) {
      <section aria-label="Abonnement" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Forfait actuel" [value]="d.etat.courant?.plan ?? 'Aucun'" icon="package" [tone]="d.etat.actif ? 'brand' : 'danger'" [hint]="d.etat.actif ? 'Actif' : 'Expiré'" />
        <app-stat-card label="Date de fin" [value]="d.etat.courant ? (d.etat.courant.ends_at | dateFr) : '—'" icon="calendar" tone="info" [hint]="d.etat.actif ? d.etat.jours_restants + ' jour(s) restant(s)' : null" />
        <app-stat-card
          label="Jours d'essai restants"
          [value]="d.etat.jours_essai_restants ?? 0"
          icon="clock"
          [tone]="d.etat.en_essai ? 'warn' : 'neutral'"
          [hint]="d.etat.en_essai ? 'Essai gratuit de ' + d.offres.essai_jours + ' jours' : 'Essai terminé'"
        />
        <app-stat-card
          label="Gérants par boutique"
          [value]="d.etat.max_gerants_par_boutique === null ? 'Illimité' : d.etat.max_gerants_par_boutique"
          icon="user-cog"
          tone="ok"
        />
      </section>

      @if (d.etat.actif && d.etat.jours_restants <= 7) {
        <p class="mt-4 flex items-center gap-2 rounded-lg bg-warn-50 p-3 text-sm text-warn-700" role="status">
          <app-icon name="alert" [size]="18" /> Votre abonnement se termine dans {{ d.etat.jours_restants }} jour(s). Pensez à le renouveler.
        </p>
      }

      <div class="mt-6 grid gap-6 lg:grid-cols-5">
        <section class="card p-5 lg:col-span-3" aria-labelledby="profil-title">
          <h2 id="profil-title" class="mb-4 font-semibold text-ink-900">Profil de l'entreprise</h2>
          <form class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="enregistrer(d.tenant.id)" novalidate>
            <div class="sm:col-span-2">
              <label class="label" for="t-name">Nom de l'entreprise</label>
              <input id="t-name" class="input" formControlName="name" aria-describedby="t-name-err" />
              @if (form.controls.name.touched && form.controls.name.invalid) {
                <p id="t-name-err" class="field-error">Le nom est obligatoire.</p>
              }
            </div>
            <div>
              <label class="label" for="t-short">Nom court</label>
              <input id="t-short" class="input" formControlName="short_name" />
            </div>
            <div>
              <label class="label" for="t-trade">Activité</label>
              <input id="t-trade" class="input" formControlName="trade" placeholder="Alimentation générale…" />
            </div>
            <div>
              <label class="label" for="t-call">Téléphone</label>
              <input id="t-call" class="input" formControlName="phone_call" appTelephoneInput />
              @if (form.controls.phone_call.touched && form.controls.phone_call.invalid) {
                <p class="field-error">Numéro sénégalais invalide.</p>
              }
            </div>
            <div>
              <label class="label" for="t-wa">WhatsApp</label>
              <input id="t-wa" class="input" formControlName="phone_whatsapp" appTelephoneInput />
              @if (form.controls.phone_whatsapp.touched && form.controls.phone_whatsapp.invalid) {
                <p class="field-error">Numéro sénégalais invalide.</p>
              }
            </div>
            <div>
              <label class="label" for="t-email">E-mail</label>
              <input id="t-email" type="email" class="input" formControlName="email" autocomplete="email" />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <p class="field-error">Adresse e-mail invalide.</p>
              }
            </div>
            <div>
              <label class="label" for="t-address">Adresse</label>
              <input id="t-address" class="input" formControlName="address" />
            </div>
            <div>
              <label class="label" for="t-ninea">NINEA</label>
              <input id="t-ninea" class="input" formControlName="ninea" />
            </div>
            <div>
              <label class="label" for="t-rccm">RCCM</label>
              <input id="t-rccm" class="input" formControlName="rccm" />
            </div>
            <div class="flex justify-end sm:col-span-2">
              <button type="submit" class="btn btn-primary" [disabled]="action.pending() || form.pristine">
                {{ action.pending() ? 'Enregistrement…' : 'Enregistrer le profil' }}
              </button>
            </div>
          </form>
        </section>

        <section class="card p-5 lg:col-span-2" aria-labelledby="historique-title">
          <h2 id="historique-title" class="mb-4 font-semibold text-ink-900">Historique des abonnements</h2>
          <ul class="divide-y divide-ink-100">
            @for (s of d.etat.historique; track s.id) {
              <li class="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p class="font-medium text-ink-900">
                    {{ s.plan }}
                    @if (s.id === d.etat.courant?.id) {
                      <app-badge tone="ok">En cours</app-badge>
                    }
                  </p>
                  <p class="text-xs text-ink-500">{{ s.starts_at | dateFr }} → {{ s.ends_at | dateFr }}</p>
                </div>
                <app-montant [value]="s.amount" />
              </li>
            }
          </ul>
        </section>
      </div>

      <section class="mt-6" aria-labelledby="offres-title">
        <h2 id="offres-title" class="mb-1 text-lg font-semibold text-ink-900">Changer de forfait</h2>
        <p class="mb-4 text-sm text-ink-600">
          Paiement par Wave ou Orange Money : contactez-nous sur WhatsApp au {{ d.offres.contact_whatsapp | telephone }}.
        </p>
        <app-offres-grid [forfaits]="d.offres.forfaits" [currentId]="d.etat.forfait?.id ?? null" />
      </section>
    }
  `,
})
export class EntreprisePage {
  private readonly tenants = inject(TENANT_REPOSITORY);
  private readonly subscriptions = inject(SUBSCRIPTION_REPOSITORY);
  private readonly plans = inject(SUBSCRIPTION_PLAN_REPOSITORY);
  private readonly auth = inject(AuthStore);
  protected readonly action = new ActionRunner(inject(ToastService));

  protected readonly data = new Loadable<Entreprise>();
  private readonly tenantId = computed(() => this.auth.user()?.tenant_id ?? null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', Validators.required],
    short_name: [''],
    email: ['', Validators.email],
    phone_call: ['', telephoneSnValidator],
    phone_whatsapp: ['', telephoneSnValidator],
    address: [''],
    trade: [''],
    ninea: [''],
    rccm: [''],
  });

  constructor() {
    effect(() => {
      const id = this.tenantId();
      untracked(() => {
        if (!id) return;
        this.data.load(() => forkJoin({ tenant: this.tenants.get(id), etat: this.subscriptions.etat(id), offres: this.plans.offers() }));
      });
    });
    effect(() => {
      const t = this.data.data()?.tenant;
      if (!t) return;
      untracked(() =>
        this.form.reset({
          name: t.name,
          short_name: t.short_name ?? '',
          email: t.email ?? '',
          phone_call: formatTelephone(t.phone_call),
          phone_whatsapp: formatTelephone(t.phone_whatsapp),
          address: t.address ?? '',
          trade: t.trade ?? '',
          ninea: t.ninea ?? '',
          rccm: t.rccm ?? '',
        }),
      );
    });
  }

  protected enregistrer(id: number): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.action.run(
      this.tenants.updateProfil(id, {
        name: v.name.trim(),
        short_name: v.short_name || null,
        email: v.email || null,
        phone_call: normalizeTelephone(v.phone_call),
        phone_whatsapp: normalizeTelephone(v.phone_whatsapp),
        address: v.address || null,
        trade: v.trade || null,
        ninea: v.ninea || null,
        rccm: v.rccm || null,
      }),
      {
        success: 'Profil de l’entreprise enregistré.',
        onSuccess: (tenant) => {
          this.auth.updateTenant(tenant);
          this.data.reload(true);
        },
      },
    );
  }
}
