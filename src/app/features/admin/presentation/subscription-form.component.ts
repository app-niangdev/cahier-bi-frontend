import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addDays, addMonths, todayIso } from '../../../core/utils/dates';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { SubscriptionPlan } from '../../abonnement/domain/subscription.model';
import { AdminSubscription, StatutAbonnement } from '../domain/admin.models';
import { ADMIN_SUBSCRIPTION_REPOSITORY } from '../domain/admin.repository';

/**
 * Enregistrement d'un abonnement payé hors application : forfait et date de début,
 * la fin est calculée par le serveur. Une période sans forfait (essai) garde ses dates saisies.
 */
@Component({
  selector: 'app-subscription-form',
  imports: [ReactiveFormsModule, DateFrPipe, FcfaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="space-y-4" [formGroup]="form" (ngSubmit)="enregistrer()" novalidate>
      @if (tenants().length > 1) {
        <div>
          <label class="label" for="s-tenant">Tenant</label>
          <select id="s-tenant" class="input" formControlName="tenant_id">
            <option [ngValue]="null" disabled>Choisir…</option>
            @for (t of tenants(); track t.tenant_id) {
              <option [ngValue]="t.tenant_id">{{ t.tenant_name }}</option>
            }
          </select>
          @if (form.controls.tenant_id.touched && form.controls.tenant_id.invalid) {
            <p class="field-error">Choisissez le tenant.</p>
          }
        </div>
      }
      @if (sansForfait()) {
        <p class="rounded-lg bg-ink-50 p-3 text-sm text-ink-700">Période sans forfait ({{ subscription()?.plan }}) : seules les dates et les notes sont modifiables.</p>
      } @else {
        <div>
          <label class="label" for="s-plan">Forfait</label>
          <select id="s-plan" class="input" formControlName="subscription_plan_id">
            <option [ngValue]="null" disabled>Choisir…</option>
            @for (p of forfaits(); track p.id) {
              <option [ngValue]="p.id">{{ p.name }} — {{ p.price | fcfa }} / {{ p.duration_months }} mois</option>
            }
          </select>
          @if (form.controls.subscription_plan_id.touched && form.controls.subscription_plan_id.invalid) {
            <p class="field-error">Choisissez le forfait.</p>
          }
        </div>
      }
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="label" for="s-start">Début</label>
          <input id="s-start" type="date" class="input" formControlName="starts_at" />
        </div>
        @if (sansForfait()) {
          <div>
            <label class="label" for="s-end">Fin</label>
            <input id="s-end" type="date" class="input" formControlName="ends_at" />
          </div>
        }
      </div>
      <div>
        <label class="label" for="s-notes">Notes</label>
        <input id="s-notes" class="input" formControlName="notes" placeholder="Ex. Payé par Wave, réf. …" />
      </div>
      @if (apercu(); as a) {
        <p class="rounded-lg bg-brand-50 p-3 text-sm text-brand-800" aria-live="polite">{{ a.plan }} : {{ a.montant | fcfa }}, jusqu'au {{ a.fin | dateFr }}.</p>
      }
      <div class="flex justify-end gap-2 border-t border-ink-100 pt-4">
        <button type="button" class="btn btn-secondary" (click)="cancelled.emit()">Annuler</button>
        <button type="submit" class="btn btn-primary" [disabled]="action.pending()">{{ subscription() ? 'Enregistrer' : 'Ajouter' }}</button>
      </div>
    </form>
  `,
})
export class SubscriptionFormComponent {
  private readonly repo = inject(ADMIN_SUBSCRIPTION_REPOSITORY);
  protected readonly action = new ActionRunner(inject(ToastService));

  /** Tenants proposés (un seul : tenant imposé) */
  readonly tenants = input.required<StatutAbonnement[]>();
  readonly tenantId = input<number | null>(null);
  readonly plans = input.required<SubscriptionPlan[]>();
  /** Modification d'un abonnement existant */
  readonly subscription = input<AdminSubscription | null>(null);
  readonly saved = output<AdminSubscription>();
  readonly cancelled = output<void>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    tenant_id: [null as number | null, Validators.required],
    subscription_plan_id: [null as number | null],
    starts_at: [todayIso(), Validators.required],
    ends_at: [''],
    notes: [''],
  });
  private readonly valeurs = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly sansForfait = computed(() => !!this.subscription() && this.subscription()!.subscription_plan_id === null);
  /** Forfaits actifs, plus celui de l'abonnement modifié s'il a été désactivé depuis */
  protected readonly forfaits = computed(() =>
    this.plans().filter((p) => p.is_active || p.id === this.subscription()?.subscription_plan_id),
  );

  protected readonly apercu = computed(() => {
    const v = this.valeurs();
    const plan = this.plans().find((p) => p.id === v.subscription_plan_id);
    if (this.sansForfait() || !plan || !v.starts_at) return null;
    return { plan: plan.name, montant: plan.price, fin: addDays(addMonths(v.starts_at, plan.duration_months), -1) };
  });

  constructor() {
    effect(() => {
      const s = this.subscription();
      const tenantId = this.tenantId() ?? (this.tenants().length === 1 ? this.tenants()[0].tenant_id : null);
      untracked(() => {
        const plan = this.forfaits()[0]?.id ?? null;
        this.form.reset({
          tenant_id: s?.tenant_id ?? tenantId,
          subscription_plan_id: s ? s.subscription_plan_id : plan,
          starts_at: s?.starts_at ?? this.debutPropose(tenantId),
          ends_at: s?.ends_at ?? '',
          notes: s?.notes ?? '',
        });
        this.form.controls.subscription_plan_id.setValidators(this.sansForfait() ? null : Validators.required);
        this.form.controls.subscription_plan_id.updateValueAndValidity();
      });
    });
  }

  /** Le lendemain de la période en cours, sinon aujourd'hui (le serveur refuse les chevauchements). */
  private debutPropose(tenantId: number | null): string {
    const statut = this.tenants().find((t) => t.tenant_id === tenantId);
    const enCours = statut && (statut.state === 'active' || statut.state === 'expiring') && statut.ends_at;
    return enCours ? addDays(statut.ends_at!, 1) : todayIso();
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      tenant_id: v.tenant_id as number,
      subscription_plan_id: v.subscription_plan_id,
      starts_at: v.starts_at,
      ends_at: this.sansForfait() ? v.ends_at : null,
      notes: v.notes.trim() || null,
    };
    const s = this.subscription();
    this.action.run(s ? this.repo.update(s.id, payload) : this.repo.add(payload), {
      success: (r) => `Abonnement ${r.plan} enregistré jusqu'au ${new Intl.DateTimeFormat('fr-FR').format(new Date(r.ends_at))}.`,
      onSuccess: (r) => this.saved.emit(r),
    });
  }
}
