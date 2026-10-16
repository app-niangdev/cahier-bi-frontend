import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BadgeComponent } from '../../../shared/components/badge.component';
import { Tone } from '../../../shared/components/stat-card.component';
import { ETAT_ABONNEMENT_LABELS, EtatAbonnement, StatutAbonnement } from '../domain/admin.models';

const TONES: Record<EtatAbonnement, Tone> = { active: 'ok', expiring: 'warn', expired: 'danger', none: 'neutral' };

/** État d'abonnement d'un tenant, avec les jours restants. */
@Component({
  selector: 'app-abonnement-badge',
  imports: [BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-badge [tone]="tone()">{{ label() }}</app-badge>`,
})
export class AbonnementBadgeComponent {
  readonly statut = input.required<StatutAbonnement>();

  protected readonly tone = computed(() => TONES[this.statut().state]);
  protected readonly label = computed(() => {
    const s = this.statut();
    const essai = s.plan === 'Essai' && (s.state === 'active' || s.state === 'expiring') ? 'Essai' : ETAT_ABONNEMENT_LABELS[s.state];
    return (s.state === 'active' || s.state === 'expiring') && s.days_left !== null ? `${essai} · ${s.days_left} j` : essai;
  });
}
