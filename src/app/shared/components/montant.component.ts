import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatFcfa } from '../pipes/fcfa.pipe';

/** Montant FCFA aligné (chiffres tabulaires), coloré selon le contexte. */
@Component({
  selector: 'app-montant',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'whitespace-nowrap tabular-nums' },
  template: `<span [class]="classe()">{{ texte() }}</span>`,
})
export class MontantComponent {
  readonly value = input.required<number | null | undefined>();
  /** du = rouge si > 0 et vert si soldé ; paye = vert ; neutre = sans couleur */
  readonly tone = input<'neutre' | 'du' | 'paye'>('neutre');
  readonly strong = input(false);

  protected readonly texte = computed(() => formatFcfa(this.value()));
  protected readonly classe = computed(() => {
    const weight = this.strong() ? 'font-semibold' : '';
    const value = this.value() ?? 0;
    if (this.tone() === 'du') return `${weight} ${value > 0 ? 'text-danger-700' : 'text-ok-700'}`;
    if (this.tone() === 'paye') return `${weight} text-ok-700`;
    return weight;
  });
}
