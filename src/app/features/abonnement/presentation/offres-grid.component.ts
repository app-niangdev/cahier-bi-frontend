import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { SubscriptionPlan } from '../domain/subscription.model';

/** Grille des forfaits (landing, abonnement expiré, mon entreprise). */
@Component({
  selector: 'app-offres-grid',
  imports: [FcfaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      @for (plan of forfaits(); track plan.id) {
        <li
          class="card relative flex flex-col p-5"
          [class.ring-2]="plan.id === highlightId() || plan.id === currentId()"
          [class.ring-brand-500]="plan.id === highlightId() || plan.id === currentId()"
        >
          @if (plan.id === currentId()) {
            <span class="chip absolute -top-3 left-5 bg-brand-600 text-white">Forfait actuel</span>
          } @else if (plan.id === highlightId()) {
            <span class="chip absolute -top-3 left-5 bg-brand-600 text-white">Le plus choisi</span>
          }
          <h3 class="text-lg font-semibold text-ink-900">{{ plan.name }}</h3>
          <p class="mt-2">
            <span class="text-2xl font-bold text-ink-900">{{ plan.price | fcfa }}</span>
            <span class="text-sm text-ink-500"> / {{ plan.duration_months === 12 ? 'an' : plan.duration_months + ' mois' }}</span>
          </p>
          <p class="mt-3 flex-1 text-sm text-ink-600">{{ plan.description }}</p>
          <p class="mt-4 text-sm font-medium text-ink-800">
            {{ plan.max_gerants_par_boutique === null ? 'Gérants illimités' : plan.max_gerants_par_boutique + ' gérant' + (plan.max_gerants_par_boutique > 1 ? 's' : '') + ' par boutique' }}
          </p>
        </li>
      }
    </ul>
  `,
})
export class OffresGridComponent {
  readonly forfaits = input.required<SubscriptionPlan[]>();
  readonly highlightId = input<number | null>(null);
  readonly currentId = input<number | null>(null);
}
