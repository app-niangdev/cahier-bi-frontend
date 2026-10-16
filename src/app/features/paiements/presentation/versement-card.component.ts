import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon.component';
import { MontantComponent } from '../../../shared/components/montant.component';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { MethodePaiementPipe } from '../../../shared/pipes/methode-paiement.pipe';
import { Versement } from '../domain/paiement.model';

/** Un versement et ses lignes (dettes touchées), avec l'action d'annulation. */
@Component({
  selector: 'app-versement-card',
  imports: [RouterLink, IconComponent, MontantComponent, DateFrPipe, MethodePaiementPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rounded-lg border border-ink-200 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold text-ink-900">
            @if (showClient()) {
              <a [routerLink]="['/app/clients', v().client_id]" class="hover:underline">{{ v().client_nom }}</a> ·
            }
            <app-montant [value]="v().montant" tone="paye" />
          </p>
          <p class="text-xs text-ink-500">
            {{ v().date_paiement | dateFr }} · {{ v().methode | methodePaiement }}
            @if (v().reference) {
              · réf. {{ v().reference }}
            }
            @if (v().enregistre_par_nom) {
              · par {{ v().enregistre_par_nom }}
            }
          </p>
          @if (v().lignes.length > 1) {
            <p class="mt-1 chip bg-info-100 text-info-700">Versement global · {{ v().lignes.length }} dettes</p>
          }
        </div>
        @if (canCancel()) {
          <button type="button" class="btn btn-secondary btn-sm text-danger-700" [disabled]="pending()" (click)="annuler.emit(v())">
            <app-icon name="undo" [size]="14" /> Annuler le versement
          </button>
        }
      </div>
      <ul class="mt-3 space-y-1 border-t border-ink-100 pt-2 text-sm" [attr.aria-label]="'Répartition du versement du ' + (v().date_paiement | dateFr)">
        @for (l of v().lignes; track l.id) {
          <li class="flex justify-between gap-2">
            <a [routerLink]="['/app/dettes', l.dette_id]" class="text-ink-600 hover:underline">Dette {{ l.dette_reference }}</a>
            <app-montant [value]="l.montant" />
          </li>
        }
      </ul>
    </article>
  `,
})
export class VersementCardComponent {
  readonly v = input.required<Versement>();
  readonly showClient = input(false);
  readonly canCancel = input(false);
  readonly pending = input(false);
  readonly annuler = output<Versement>();
}
