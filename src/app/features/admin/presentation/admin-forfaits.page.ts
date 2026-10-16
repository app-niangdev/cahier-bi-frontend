import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BadgeComponent } from '../../../shared/components/badge.component';
import { ConfirmService } from '../../../shared/components/confirm/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { ModalComponent } from '../../../shared/components/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { Loadable } from '../../../shared/utils/loadable';
import { SubscriptionPlan } from '../../abonnement/domain/subscription.model';
import { SUBSCRIPTION_PLAN_REPOSITORY } from '../../abonnement/domain/subscription.repository';

/** Forfaits (/subscription-plans/*) : CRUD et activation. Prix et durée ne sont plus modifiables après création. */
@Component({
  selector: 'app-admin-forfaits-page',
  imports: [ReactiveFormsModule, PageHeaderComponent, SkeletonComponent, ErrorStateComponent, EmptyStateComponent, ModalComponent, BadgeComponent, IconComponent, AutofocusDirective, FcfaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Forfaits" subtitle="Offres d'abonnement proposées aux propriétaires">
      <button type="button" class="btn btn-primary" (click)="ouvrir(null)"><app-icon name="plus" [size]="18" /> Nouveau forfait</button>
    </app-page-header>

    @if (plans.initialLoading()) {
      <app-skeleton variant="stats" [rows]="4" />
    } @else if (plans.error()) {
      <app-error-state [message]="plans.error()" (retry)="plans.reload()" />
    } @else if ((plans.data() ?? []).length === 0) {
      <div class="card"><app-empty-state icon="package" title="Aucun forfait" /></div>
    } @else {
      <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (p of plans.data(); track p.id) {
          <li class="card flex flex-col p-5" [class.opacity-60]="!p.is_active">
            <div class="flex items-start justify-between gap-2">
              <h2 class="text-lg font-semibold text-ink-900">{{ p.name }}</h2>
              <app-badge [tone]="p.is_active ? 'ok' : 'neutral'">{{ p.is_active ? 'Actif' : 'Désactivé' }}</app-badge>
            </div>
            <p class="mt-1 text-2xl font-bold">{{ p.price | fcfa }}</p>
            <p class="text-sm text-ink-500">{{ p.duration_months }} mois · position {{ p.position }}</p>
            <p class="mt-2 text-sm font-medium text-ink-800">
              {{ p.max_gerants_par_boutique === null ? 'Gérants illimités' : p.max_gerants_par_boutique + ' gérant(s) / boutique' }}
            </p>
            <p class="mt-2 flex-1 text-sm text-ink-600">{{ p.description }}</p>
            <p class="mt-2 text-xs text-ink-500">{{ p.subscriptions_count ? p.subscriptions_count + ' abonnement(s) enregistré(s)' : 'Jamais utilisé' }}</p>
            <div class="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
              <button type="button" class="btn btn-secondary btn-sm" (click)="ouvrir(p)" [attr.aria-label]="'Modifier ' + p.name">Modifier</button>
              <button type="button" class="btn btn-secondary btn-sm" [disabled]="action.pending()" (click)="basculer(p)">{{ p.is_active ? 'Désactiver' : 'Activer' }}</button>
              @if (!p.subscriptions_count) {
                <button type="button" class="btn btn-secondary btn-sm text-danger-700" [disabled]="action.pending()" (click)="supprimer(p)">Supprimer</button>
              }
            </div>
          </li>
        }
      </ul>
    }

    <app-modal [open]="formOpen()" [title]="edition() ? 'Modifier le forfait' : 'Nouveau forfait'" (closed)="formOpen.set(false)">
      <form class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="enregistrer()" novalidate>
        <div class="sm:col-span-2">
          <label class="label" for="f-name">Nom</label>
          <input id="f-name" class="input" formControlName="name" appAutofocus />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <p class="field-error">Le nom est obligatoire.</p>
          }
        </div>
        <div>
          <label class="label" for="f-price">Prix (FCFA)</label>
          <input id="f-price" type="number" min="0" step="500" class="input" formControlName="price" aria-describedby="f-locked" />
        </div>
        <div>
          <label class="label" for="f-duration">Durée (mois)</label>
          <input id="f-duration" type="number" min="1" max="60" class="input" formControlName="duration_months" aria-describedby="f-locked" />
        </div>
        @if (edition()) {
          <p id="f-locked" class="text-xs text-ink-500 sm:col-span-2">Le prix et la durée ne sont pas modifiables : créez un nouveau forfait si besoin.</p>
        }
        <div>
          <label class="label" for="f-max">Gérants max. par boutique</label>
          <input id="f-max" type="number" min="0" class="input" formControlName="max_gerants_par_boutique" placeholder="Vide = illimité" />
        </div>
        <div>
          <label class="label" for="f-position">Position d'affichage</label>
          <input id="f-position" type="number" min="0" class="input" formControlName="position" />
        </div>
        <div class="sm:col-span-2">
          <label class="label" for="f-desc">Description</label>
          <textarea id="f-desc" rows="2" class="input" formControlName="description"></textarea>
        </div>
        <div class="flex justify-end gap-2 sm:col-span-2">
          <button type="button" class="btn btn-secondary" (click)="formOpen.set(false)">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="action.pending()">Enregistrer</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class AdminForfaitsPage {
  private readonly repo = inject(SUBSCRIPTION_PLAN_REPOSITORY);
  private readonly confirm = inject(ConfirmService);
  protected readonly action = new ActionRunner(inject(ToastService));

  protected readonly plans = new Loadable<SubscriptionPlan[]>();
  protected readonly formOpen = signal(false);
  protected readonly edition = signal<SubscriptionPlan | null>(null);
  private readonly prochainePosition = computed(() => Math.max(0, ...(this.plans.data() ?? []).map((p) => p.position)) + 1);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    duration_months: [1, [Validators.required, Validators.min(1)]],
    max_gerants_par_boutique: [null as number | null, Validators.min(0)],
    position: [1],
    description: [''],
  });

  constructor() {
    this.plans.load(() => this.repo.list());
  }

  protected ouvrir(p: SubscriptionPlan | null): void {
    this.edition.set(p);
    this.form.reset({
      name: p?.name ?? '',
      price: p?.price ?? 0,
      duration_months: p?.duration_months ?? 1,
      max_gerants_par_boutique: p ? p.max_gerants_par_boutique : 1,
      position: p?.position ?? this.prochainePosition(),
      description: p?.description ?? '',
    });
    if (p) {
      this.form.controls.price.disable();
      this.form.controls.duration_months.disable();
    } else {
      this.form.controls.price.enable();
      this.form.controls.duration_months.enable();
    }
    this.formOpen.set(true);
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const p = this.edition();
    const max = v.max_gerants_par_boutique;
    const payload = {
      name: v.name,
      price: Number(v.price),
      duration_months: Number(v.duration_months),
      max_gerants_par_boutique: max === null || (max as unknown) === '' ? null : Number(max),
      position: Number(v.position),
      description: v.description || null,
      is_active: p?.is_active ?? true,
      currency: 'XOF',
    };
    this.action.run(p ? this.repo.update(p.id, payload) : this.repo.create(payload), {
      success: (r) => `Forfait ${r.name} enregistré.`,
      onSuccess: () => {
        this.formOpen.set(false);
        this.plans.reload(true);
      },
    });
  }

  protected basculer(p: SubscriptionPlan): void {
    this.action.run(this.repo.toggleStatus(p.id), {
      success: (r) => `${r.name} ${r.is_active ? 'activé' : 'désactivé'}.`,
      onSuccess: () => this.plans.reload(true),
    });
  }

  protected async supprimer(p: SubscriptionPlan): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Supprimer le forfait ${p.name} ?`,
      message: 'Impossible s’il est déjà utilisé par des abonnements : désactivez-le dans ce cas.',
      confirmLabel: 'Supprimer',
    });
    if (ok) this.action.run(this.repo.delete(p.id), { success: 'Forfait supprimé.', onSuccess: () => this.plans.reload(true) });
  }
}
