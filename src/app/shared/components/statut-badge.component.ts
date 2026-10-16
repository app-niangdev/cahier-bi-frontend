import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DetteStatut } from '../../core/domain/enums';
import { StatutDettePipe } from '../pipes/statut-dette.pipe';

/** Badge de statut de dette : couleurs dédiées (variables --color-statut-*). */
const CLASSES: Record<DetteStatut, string> = {
  en_retard: 'bg-statut-retard-bg text-statut-retard-fg',
  a_aujourdhui: 'bg-statut-aujourdhui-bg text-statut-aujourdhui-fg',
  en_attente: 'bg-statut-attente-bg text-statut-attente-fg',
  payee: 'bg-statut-payee-bg text-statut-payee-fg',
  annulee: 'bg-statut-annulee-bg text-statut-annulee-fg line-through',
};

const DOTS: Record<DetteStatut, string> = {
  en_retard: 'bg-statut-retard-fg',
  a_aujourdhui: 'bg-statut-aujourdhui-fg',
  en_attente: 'bg-statut-attente-fg',
  payee: 'bg-statut-payee-fg',
  annulee: 'bg-statut-annulee-fg',
};

@Component({
  selector: 'app-statut-badge',
  imports: [StatutDettePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip gap-1.5 {{ classes[statut()] }}">
      <span class="h-1.5 w-1.5 rounded-full {{ dots[statut()] }}" aria-hidden="true"></span>
      {{ statut() | statutDette }}
    </span>
  `,
})
export class StatutBadgeComponent {
  readonly statut = input.required<DetteStatut>();
  protected readonly classes = CLASSES;
  protected readonly dots = DOTS;
}
