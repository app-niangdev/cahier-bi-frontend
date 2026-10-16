import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { NoBoutiqueComponent } from '../../../core/boutique/no-boutique.component';
import {
  CANAL_RAPPEL_LABELS,
  CanalRappel,
  STATUT_RAPPEL_LABELS,
  StatutRappel,
  TON_RAPPEL_LABELS,
  TonRappel,
  toOptions,
} from '../../../core/domain/enums';
import { BadgeComponent } from '../../../shared/components/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { Tone } from '../../../shared/components/stat-card.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { formatFcfa } from '../../../shared/pipes/fcfa.pipe';
import { TelephonePipe } from '../../../shared/pipes/telephone.pipe';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { Loadable } from '../../../shared/utils/loadable';
import { parseDate } from '../../../core/utils/dates';
import { Dette } from '../../dettes/domain/dette.model';
import { estOuverte } from '../../dettes/domain/dette-rules';
import { DETTE_REPOSITORY } from '../../dettes/domain/dette.repository';
import { Rappel, genererMessageRappel } from '../domain/rappel.model';
import { RAPPEL_REPOSITORY } from '../domain/rappel.repository';

interface DonneesRappels {
  dettes: Dette[];
  rappels: Rappel[];
}

const STATUT_TONES: Record<StatutRappel, Tone> = { en_attente: 'neutral', envoye: 'ok', echoue: 'danger' };

/** Préparation d'un rappel (canal, ton, aperçu) et historique simulé. */
@Component({
  selector: 'app-rappels-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    NoBoutiqueComponent,
    BadgeComponent,
    IconComponent,
    DateFrPipe,
    TelephonePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Rappels" subtitle="Relancez vos clients par WhatsApp ou SMS" />

    @if (!ctx.current()) {
      <app-no-boutique />
    } @else if (donnees.initialLoading()) {
      <app-skeleton variant="detail" [rows]="4" />
    } @else if (donnees.error()) {
      <app-error-state [message]="donnees.error()" (retry)="donnees.reload()" />
    } @else {
      <div class="grid gap-6 lg:grid-cols-5">
        <section class="card p-5 lg:col-span-3" aria-labelledby="preparer-title">
          <h2 id="preparer-title" class="mb-4 font-semibold text-ink-900">Préparer un rappel</h2>
          @if (dettesOuvertes().length === 0) {
            <app-empty-state icon="check" title="Aucune dette à relancer" message="Toutes les dettes de cette boutique sont réglées." />
          } @else {
            <form class="space-y-4" [formGroup]="form" (ngSubmit)="envoyer()" novalidate>
              <div>
                <label class="label" for="rappel-dette">Dette à relancer</label>
                <select id="rappel-dette" class="input" formControlName="dette_id">
                  @for (d of dettesOuvertes(); track d.id) {
                    <option [ngValue]="d.id">{{ d.client?.nom }} · {{ d.reference }} · {{ fcfa(d.montant_restant) }}{{ d.statut === 'en_retard' ? ' (en retard)' : '' }}</option>
                  }
                </select>
              </div>

              <fieldset>
                <legend class="label">Canal</legend>
                <div class="grid grid-cols-2 gap-2">
                  @for (c of canaux; track c.value) {
                    <label class="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                      <input type="radio" formControlName="canal" [value]="c.value" class="accent-brand-600" />
                      <app-icon [name]="c.value === 'whatsapp' ? 'message' : 'phone'" [size]="18" />
                      {{ c.label }}
                    </label>
                  }
                </div>
              </fieldset>

              <fieldset>
                <legend class="label">Ton du message</legend>
                <div class="grid grid-cols-3 gap-2">
                  @for (t of tons; track t.value) {
                    <label class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                      <input type="radio" formControlName="ton" [value]="t.value" class="accent-brand-600" />
                      {{ t.label }}
                    </label>
                  }
                </div>
              </fieldset>

              <div>
                <div class="flex items-center justify-between">
                  <label class="label" for="rappel-message">Aperçu du message</label>
                  <button type="button" class="link mb-1.5 text-xs" (click)="regenerer()">Régénérer</button>
                </div>
                <textarea id="rappel-message" rows="5" class="input" formControlName="message" aria-describedby="rappel-dest"></textarea>
                <p id="rappel-dest" class="mt-1 text-xs text-ink-500">
                  Destinataire :
                  @if (destinataire(); as num) {
                    {{ num | telephone }}
                  } @else {
                    <span class="text-danger-700">aucun numéro {{ form.controls.canal.value === 'whatsapp' ? 'WhatsApp' : '' }} pour ce client</span>
                  }
                </p>
              </div>

              <div class="flex flex-wrap justify-end gap-2">
                @if (detteSelectionnee(); as d) {
                  <a [routerLink]="['/app/dettes', d.id]" class="btn btn-secondary">Voir la dette</a>
                }
                <button type="submit" class="btn btn-primary" [disabled]="action.pending()">
                  <app-icon name="bell" [size]="18" /> {{ action.pending() ? 'Envoi…' : 'Envoyer le rappel (simulé)' }}
                </button>
              </div>
            </form>
          }
        </section>

        <section class="card p-5 lg:col-span-2" aria-labelledby="historique-title">
          <h2 id="historique-title" class="mb-4 font-semibold text-ink-900">Historique</h2>
          @if (historique().length === 0) {
            <app-empty-state icon="bell" title="Aucun rappel envoyé" />
          } @else {
            <ul class="space-y-3">
              @for (r of historique(); track r.id) {
                <li class="rounded-lg border border-ink-200 p-3">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-sm font-medium text-ink-900">{{ r.client }} · {{ r.reference }}</p>
                    <app-badge [tone]="statutTones[r.statut]">{{ statutLabels[r.statut] }}</app-badge>
                  </div>
                  <p class="mt-1 text-xs text-ink-500">
                    {{ canalLabels[r.canal] }} · ton {{ tonLabels[r.ton].toLowerCase() }} · {{ r.envoye_le ? (r.envoye_le | dateFr: 'heure') : 'programmé' }}
                  </p>
                  <p class="mt-2 line-clamp-3 text-sm text-ink-700">{{ r.message }}</p>
                  @if (r.erreur) {
                    <p class="mt-1 text-xs text-danger-700">{{ r.erreur }}</p>
                  }
                </li>
              }
            </ul>
          }
        </section>
      </div>
    }
  `,
})
export class RappelsPage {
  private readonly repo = inject(RAPPEL_REPOSITORY);
  private readonly dettesRepo = inject(DETTE_REPOSITORY);
  protected readonly ctx = inject(BoutiqueContextStore);
  private readonly toast = inject(ToastService);
  protected readonly action = new ActionRunner(this.toast);

  /** ?dette=12 : dette présélectionnée depuis sa fiche */
  readonly dette = input<string | undefined>();

  protected readonly donnees = new Loadable<DonneesRappels>();
  protected readonly canaux = toOptions(CANAL_RAPPEL_LABELS);
  protected readonly tons = toOptions(TON_RAPPEL_LABELS);
  protected readonly canalLabels = CANAL_RAPPEL_LABELS;
  protected readonly tonLabels = TON_RAPPEL_LABELS;
  protected readonly statutLabels = STATUT_RAPPEL_LABELS;
  protected readonly statutTones = STATUT_TONES;
  private readonly envoyes = signal<Rappel[]>([]);

  protected readonly form = inject(NonNullableFormBuilder).group({
    dette_id: [null as number | null, Validators.required],
    canal: ['whatsapp' as CanalRappel],
    ton: ['poli' as TonRappel],
    message: ['', Validators.required],
  });
  private readonly valeurs = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly dettesOuvertes = computed(() =>
    (this.donnees.data()?.dettes ?? []).filter(estOuverte).sort((a, b) => (a.statut === 'en_retard' ? -1 : 0) - (b.statut === 'en_retard' ? -1 : 0)),
  );
  protected readonly detteSelectionnee = computed(() => this.dettesOuvertes().find((d) => d.id === this.valeurs().dette_id) ?? null);
  protected readonly destinataire = computed(() => {
    const d = this.detteSelectionnee();
    return this.valeurs().canal === 'whatsapp' ? (d?.client?.whatsapp ?? null) : (d?.client?.telephone ?? null);
  });
  protected readonly historique = computed(() => {
    const dettes = new Map((this.donnees.data()?.dettes ?? []).map((d) => [d.id, d]));
    return [...this.envoyes(), ...(this.donnees.data()?.rappels ?? [])].map((r) => ({
      ...r,
      client: dettes.get(r.dette_id)?.client?.nom ?? 'Client',
      reference: dettes.get(r.dette_id)?.reference ?? '',
    }));
  });

  constructor() {
    effect(() => {
      const boutiqueId = this.ctx.currentId();
      untracked(() => {
        this.envoyes.set([]);
        if (!boutiqueId) return this.donnees.reset();
        this.donnees.load(() => forkJoin({ dettes: this.dettesRepo.list(boutiqueId), rappels: this.repo.list(boutiqueId) }));
      });
    });
    // Sélection initiale : dette demandée dans l'URL, sinon la première (les retards d'abord)
    effect(() => {
      const ouvertes = this.dettesOuvertes();
      const demandee = Number(this.dette());
      untracked(() => {
        if (ouvertes.length === 0) return;
        const courante = this.form.controls.dette_id.value;
        if (courante && ouvertes.some((d) => d.id === courante)) return;
        this.form.controls.dette_id.setValue(ouvertes.some((d) => d.id === demandee) ? demandee : ouvertes[0].id);
      });
    });
    // Le message est régénéré quand la dette ou le ton change
    effect(() => {
      const { ton } = this.valeurs();
      this.detteSelectionnee();
      untracked(() => this.regenerer(ton));
    });
  }

  protected fcfa(value: number): string {
    return formatFcfa(value);
  }

  protected regenerer(ton = this.form.controls.ton.value): void {
    const d = this.detteSelectionnee();
    if (!d) return;
    const echeance = d.date_echeance ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(parseDate(d.date_echeance)) : null;
    this.form.controls.message.setValue(
      genererMessageRappel(ton, {
        client: d.client?.nom ?? 'cher client',
        boutique: this.ctx.current()?.nom ?? 'la boutique',
        reference: d.reference,
        montant_restant: formatFcfa(d.montant_restant),
        echeance,
      }),
      { emitEvent: false },
    );
  }

  protected envoyer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.dette_id === null) return;
    this.action.run(this.repo.envoyer({ dette_id: v.dette_id, canal: v.canal, ton: v.ton, message: v.message }), {
      success: (r) => (r.statut === 'envoye' ? `Rappel envoyé par ${CANAL_RAPPEL_LABELS[r.canal]}.` : ''),
      onSuccess: (r) => {
        this.envoyes.update((list) => [r, ...list]);
        if (r.statut === 'echoue') this.toast.error(`Échec de l'envoi : ${r.erreur ?? 'erreur inconnue'}`);
      },
    });
  }
}
