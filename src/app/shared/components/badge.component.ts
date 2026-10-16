import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tone } from './stat-card.component';

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-800',
  danger: 'bg-danger-100 text-danger-700',
  warn: 'bg-warn-100 text-warn-700',
  info: 'bg-info-100 text-info-700',
  ok: 'bg-ok-100 text-ok-700',
  neutral: 'bg-ink-100 text-ink-700',
};

/** Pastille générique (rôle, statut de boutique, statut de rappel…). */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="chip {{ tones[tone()] }}"><ng-content /></span>`,
})
export class BadgeComponent {
  readonly tone = input<Tone>('neutral');
  protected readonly tones = TONES;
}
