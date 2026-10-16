import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { NoBoutiqueComponent } from '../../../core/boutique/no-boutique.component';
import { addDays, todayIso } from '../../../core/utils/dates';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { StatutBadgeComponent } from '../../../shared/components/statut-badge.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { Loadable } from '../../../shared/utils/loadable';
import { Client } from '../../clients/domain/client.model';
import { CLIENT_REPOSITORY } from '../../clients/domain/client.repository';
import { statutSelonEcheance } from '../domain/dette-rules';
import { DetteDetail } from '../domain/dette.model';
import { DETTE_REPOSITORY } from '../domain/dette.repository';

/**
 * Création (/dettes/nouvelle?client=12) et modification (/dettes/:id/modifier).
 * Le montant n'est modifiable que par le propriétaire, jamais sous le montant déjà payé.
 */
@Component({
  selector: 'app-dette-form-page',
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, SkeletonComponent, ErrorStateComponent, NoBoutiqueComponent, StatutBadgeComponent, FcfaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="isEdit() ? 'Modifier la dette' : 'Nouvelle dette'" [backLink]="retour()" />

    @if (!ctx.current()) {
      <app-no-boutique />
    } @else if (existing.initialLoading() || clients.initialLoading()) {
      <app-skeleton variant="detail" [rows]="3" />
    } @else if (existing.error() || clients.error()) {
      <app-error-state [message]="existing.error() ?? clients.error()" (retry)="recharger()" />
    } @else if (!isEdit() && (clients.data() ?? []).length === 0) {
      <div class="card p-6 text-center">
        <p class="text-ink-700">Ajoutez d'abord un client pour pouvoir lui noter une dette.</p>
        <a routerLink="/app/clients/nouveau" class="btn btn-primary mt-4">Nouveau client</a>
      </div>
    } @else {
      <form class="card max-w-2xl space-y-4 p-6" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (isEdit()) {
          <p class="rounded-lg bg-ink-50 p-3 text-sm text-ink-700">
            {{ existing.data()?.reference }} · {{ existing.data()?.client?.nom }} · déjà payé {{ existing.data()?.montant_paye ?? 0 | fcfa }}
          </p>
        } @else {
          <div>
            <label class="label" for="client">Client <span class="text-danger-700" aria-hidden="true">*</span></label>
            <select id="client" class="input" formControlName="client_id" required aria-describedby="client-err">
              <option [ngValue]="null" disabled>Choisir un client…</option>
              @for (c of clients.data() ?? []; track c.id) {
                <option [ngValue]="c.id">{{ c.nom }}{{ c.total_du > 0 ? ' — doit ' + (c.total_du | fcfa) : '' }}</option>
              }
            </select>
            @if (form.controls.client_id.touched && form.controls.client_id.invalid) {
              <p id="client-err" class="field-error">Choisissez le client.</p>
            }
          </div>
        }

        <div>
          <label class="label" for="montant">Montant (FCFA) <span class="text-danger-700" aria-hidden="true">*</span></label>
          <input id="montant" type="number" inputmode="numeric" min="1" step="1" class="input" formControlName="montant" aria-describedby="montant-help montant-err" />
          @if (isEdit() && !auth.isProprietaire()) {
            <p id="montant-help" class="mt-1 text-xs text-ink-500">Seul le propriétaire peut modifier le montant d'une dette.</p>
          }
          @if (form.controls.montant.touched && form.controls.montant.invalid) {
            <p id="montant-err" class="field-error">
              @if (form.controls.montant.hasError('min') && isEdit()) {
                Le montant ne peut pas être inférieur au montant déjà payé ({{ minMontant() | fcfa }}).
              } @else {
                Saisissez un montant supérieur à 0.
              }
            </p>
          }
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="date_creation">Date de l'achat</label>
            <input id="date_creation" type="date" class="input" formControlName="date_creation" [max]="today" />
          </div>
          <div>
            <label class="label" for="date_echeance">Date d'échéance</label>
            <input id="date_echeance" type="date" class="input" formControlName="date_echeance" aria-describedby="echeance-help" />
            <div id="echeance-help" class="mt-1 flex flex-wrap items-center gap-2 text-xs">
              @for (j of [7, 15, 30]; track j) {
                <button type="button" class="link" (click)="echeanceDans(j)">+{{ j }} j</button>
              }
              <span class="text-ink-500">Statut :</span>
              <app-statut-badge [statut]="statutPrevu()" />
            </div>
          </div>
        </div>

        <div>
          <label class="label" for="note">Note (articles achetés…)</label>
          <textarea id="note" rows="3" class="input" formControlName="note" placeholder="Ex. Riz 25 kg + huile 5 L"></textarea>
        </div>

        <div class="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
          <a [routerLink]="retour()" class="btn btn-secondary">Annuler</a>
          <button type="submit" class="btn btn-primary" [disabled]="action.pending()">
            {{ action.pending() ? 'Enregistrement…' : isEdit() ? 'Enregistrer' : 'Créer la dette' }}
          </button>
        </div>
      </form>
    }
  `,
})
export class DetteFormPage {
  private readonly repo = inject(DETTE_REPOSITORY);
  private readonly clientsRepo = inject(CLIENT_REPOSITORY);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthStore);
  protected readonly ctx = inject(BoutiqueContextStore);
  protected readonly action = new ActionRunner(inject(ToastService));

  readonly id = input<string | undefined>();
  /** ?client=12 : client présélectionné */
  readonly client = input<string | undefined>();

  protected readonly today = todayIso();
  protected readonly detteId = computed(() => (this.id() ? Number(this.id()) : null));
  protected readonly isEdit = computed(() => this.detteId() !== null);
  protected readonly retour = computed(() => (this.detteId() ? `/app/dettes/${this.detteId()}` : this.client() ? `/app/clients/${this.client()}` : '/app/dettes'));
  protected readonly existing = new Loadable<DetteDetail>();
  protected readonly clients = new Loadable<Client[]>();
  protected readonly minMontant = computed(() => this.existing.data()?.montant_paye ?? 0);

  protected readonly form = inject(NonNullableFormBuilder).group({
    client_id: [null as number | null, Validators.required],
    montant: [null as number | null, [Validators.required, Validators.min(1)]],
    date_creation: [todayIso()],
    date_echeance: [addDays(todayIso(), 30)],
    note: [''],
  });

  private readonly echeance = toSignal(this.form.controls.date_echeance.valueChanges, {
    initialValue: this.form.controls.date_echeance.value,
  });
  protected readonly statutPrevu = computed(() => statutSelonEcheance(this.echeance() || null));

  constructor() {
    effect(() => {
      const id = this.detteId();
      const boutiqueId = this.ctx.currentId();
      untracked(() => {
        if (id) {
          this.form.controls.client_id.disable();
          this.existing.load(() => this.repo.get(id));
        } else if (boutiqueId) {
          this.clients.load(() => this.clientsRepo.list(boutiqueId));
        }
      });
    });
    effect(() => {
      const preselect = this.client();
      if (preselect) untracked(() => this.form.controls.client_id.setValue(Number(preselect)));
    });
    effect(() => {
      const d = this.existing.data();
      if (!d) return;
      untracked(() => {
        this.form.patchValue({
          client_id: d.client_id,
          montant: d.montant,
          date_creation: d.date_creation,
          date_echeance: d.date_echeance ?? '',
          note: d.note ?? '',
        });
        this.form.controls.date_creation.disable();
        this.form.controls.montant.setValidators([Validators.required, Validators.min(Math.max(1, d.montant_paye))]);
        if (!this.auth.isProprietaire()) this.form.controls.montant.disable();
      });
    });
  }

  protected recharger(): void {
    if (this.existing.error()) this.existing.reload();
    if (this.clients.error()) this.clients.reload();
  }

  protected echeanceDans(jours: number): void {
    const base = this.form.controls.date_creation.value || todayIso();
    this.form.controls.date_echeance.setValue(addDays(base, jours));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const id = this.detteId();
    if (id) {
      const montantModifiable = this.auth.isProprietaire();
      this.action.run(
        this.repo.update(id, {
          ...(montantModifiable ? { montant: v.montant ?? 0 } : {}),
          date_echeance: v.date_echeance || null,
          note: v.note || null,
        }),
        { success: 'Dette modifiée.', onSuccess: () => void this.router.navigate(['/app/dettes', id]) },
      );
      return;
    }
    const boutiqueId = this.ctx.currentId();
    if (!boutiqueId || v.client_id === null) return;
    this.action.run(
      this.repo.create(boutiqueId, {
        client_id: v.client_id,
        montant: v.montant ?? 0,
        date_creation: v.date_creation || null,
        date_echeance: v.date_echeance || null,
        note: v.note || null,
      }),
      {
        success: (d) => `Dette ${d.reference} enregistrée.`,
        onSuccess: (d) => void this.router.navigate(['/app/dettes', d.id]),
      },
    );
  }
}
