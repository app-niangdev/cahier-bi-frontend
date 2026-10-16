import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { METHODE_PAIEMENT_LABELS, MethodePaiement, toOptions } from '../../../core/domain/enums';
import { todayIso } from '../../../core/utils/dates';
import { ModalComponent } from '../../../shared/components/modal.component';
import { MontantComponent } from '../../../shared/components/montant.component';
import { StatutBadgeComponent } from '../../../shared/components/statut-badge.component';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { Dette } from '../../dettes/domain/dette.model';
import { estOuverte, repartir } from '../../dettes/domain/dette-rules';
import { EncaissementPayload } from '../domain/paiement.model';

/**
 * Encaissement d'un paiement : sur une dette précise (« Payer ») ou en
 * versement global du client, avec aperçu de la répartition de la dette
 * la plus ancienne à la plus récente.
 */
@Component({
  selector: 'app-encaissement-dialog',
  imports: [ReactiveFormsModule, ModalComponent, MontantComponent, StatutBadgeComponent, FcfaPipe, DateFrPipe, AutofocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" [title]="title()" [subtitle]="subtitle()" [size]="global() ? 'lg' : 'md'" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
        <div class="rounded-lg bg-ink-50 p-3 text-sm">
          Reste dû : <app-montant [value]="resteDu()" [strong]="true" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="enc-montant">Montant encaissé (FCFA)</label>
            <input
              id="enc-montant"
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              class="input"
              formControlName="montant"
              appAutofocus
              aria-describedby="enc-montant-err"
            />
            @if (form.controls.montant.touched && form.controls.montant.invalid) {
              <p id="enc-montant-err" class="field-error">
                @if (form.controls.montant.hasError('max')) {
                  Le montant ne peut pas dépasser {{ resteDu() | fcfa }}.
                } @else {
                  Saisissez un montant supérieur à 0.
                }
              </p>
            }
            <button type="button" class="link mt-1 text-xs" (click)="toutRegler()">Tout régler ({{ resteDu() | fcfa }})</button>
          </div>
          <div>
            <label class="label" for="enc-methode">Méthode de paiement</label>
            <select id="enc-methode" class="input" formControlName="methode">
              @for (m of methodes; track m.value) {
                <option [value]="m.value">{{ m.label }}</option>
              }
            </select>
          </div>
          <div>
            <label class="label" for="enc-date">Date du paiement</label>
            <input id="enc-date" type="date" class="input" formControlName="date_paiement" [max]="today" />
          </div>
          <div>
            <label class="label" for="enc-reference">Référence (optionnel)</label>
            <input id="enc-reference" class="input" formControlName="reference" placeholder="N° de transaction Wave, OM…" />
          </div>
        </div>
        <div>
          <label class="label" for="enc-note">Note (optionnel)</label>
          <input id="enc-note" class="input" formControlName="note" />
        </div>

        @if (global()) {
          <section aria-labelledby="repartition-title">
            <h3 id="repartition-title" class="mb-2 text-sm font-semibold text-ink-800">Aperçu de la répartition (de la plus ancienne à la plus récente)</h3>
            <div class="overflow-hidden rounded-lg border border-ink-200">
              <table class="w-full text-sm">
                <caption class="sr-only">Répartition du versement sur les dettes ouvertes</caption>
                <thead class="bg-ink-50 text-xs text-ink-600 uppercase">
                  <tr>
                    <th scope="col" class="px-3 py-2 text-left">Dette</th>
                    <th scope="col" class="px-3 py-2 text-right">Restant</th>
                    <th scope="col" class="px-3 py-2 text-right">Imputé</th>
                    <th scope="col" class="hidden px-3 py-2 text-right sm:table-cell">Après</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ink-100">
                  @for (ligne of repartition(); track ligne.dette.id) {
                    <tr [class.bg-brand-50]="ligne.part > 0">
                      <td class="px-3 py-2">
                        <span class="font-medium">{{ ligne.dette.reference }}</span>
                        <span class="block text-xs text-ink-500">du {{ ligne.dette.date_creation | dateFr }}</span>
                      </td>
                      <td class="px-3 py-2 text-right"><app-montant [value]="ligne.dette.montant_restant" /></td>
                      <td class="px-3 py-2 text-right font-semibold" [class.text-ok-700]="ligne.part > 0">
                        {{ ligne.part > 0 ? (ligne.part | fcfa) : '—' }}
                      </td>
                      <td class="hidden px-3 py-2 text-right sm:table-cell">
                        @if (ligne.reste_apres === 0) {
                          <app-statut-badge statut="payee" />
                        } @else {
                          <app-montant [value]="ligne.reste_apres" />
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="mt-2 text-xs text-ink-600" aria-live="polite">
              {{ nbSoldees() }} dette{{ nbSoldees() > 1 ? 's' : '' }} soldée{{ nbSoldees() > 1 ? 's' : '' }} par ce versement.
            </p>
          </section>
        }

        <div class="flex flex-col-reverse gap-2 border-t border-ink-200 pt-4 sm:flex-row sm:justify-end">
          <button type="button" class="btn btn-secondary" (click)="closed.emit()">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="pending()">
            {{ pending() ? 'Enregistrement…' : 'Encaisser ' + ((montant() ?? 0) | fcfa) }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class EncaissementDialogComponent {
  readonly open = input.required<boolean>();
  readonly title = input('Encaisser un paiement');
  readonly subtitle = input<string | null>(null);
  /** Dettes concernées : une seule pour « Payer », toutes les dettes ouvertes pour un versement global */
  readonly dettes = input.required<Dette[]>();
  readonly global = input(false);
  readonly pending = input(false);
  readonly submitted = output<EncaissementPayload>();
  readonly closed = output<void>();

  protected readonly today = todayIso();
  protected readonly methodes = toOptions(METHODE_PAIEMENT_LABELS);

  protected readonly form = inject(NonNullableFormBuilder).group({
    montant: [null as number | null, [Validators.required, Validators.min(1)]],
    methode: ['especes' as MethodePaiement, Validators.required],
    date_paiement: [todayIso(), Validators.required],
    reference: [''],
    note: [''],
  });

  protected readonly ouvertes = computed(() => this.dettes().filter(estOuverte));
  protected readonly resteDu = computed(() => this.ouvertes().reduce((s, d) => s + d.montant_restant, 0));
  protected readonly montant = toSignal(this.form.controls.montant.valueChanges, { initialValue: null });
  protected readonly repartition = computed(() => repartir(this.ouvertes(), this.montant() ?? 0));
  protected readonly nbSoldees = computed(() => this.repartition().filter((l) => l.part > 0 && l.reste_apres === 0).length);

  constructor() {
    // Réinitialise le formulaire à chaque ouverture et borne le montant au reste dû
    effect(() => {
      if (!this.open()) return;
      const max = this.resteDu();
      this.form.reset({ montant: null, methode: 'especes', date_paiement: todayIso(), reference: '', note: '' });
      this.form.controls.montant.setValidators([Validators.required, Validators.min(1), Validators.max(max)]);
      this.form.controls.montant.updateValueAndValidity();
    });
  }

  protected toutRegler(): void {
    this.form.controls.montant.setValue(this.resteDu());
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitted.emit({
      montant: Math.round(value.montant ?? 0),
      methode: value.methode,
      date_paiement: value.date_paiement,
      reference: value.reference || null,
      note: value.note || null,
    });
  }
}
