import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Indicateur de quota de gérants : « 2 / 3 », « 1 / ∞ ». */
@Component({
  selector: 'app-quota-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip gap-1 tabular-nums {{ classe() }}" [attr.aria-label]="ariaLabel()">
      {{ utilises() }} / {{ max() === null ? '∞' : max() }}
      <span aria-hidden="true">gérant{{ (max() ?? 2) > 1 ? 's' : '' }}</span>
    </span>
  `,
})
export class QuotaBadgeComponent {
  readonly utilises = input.required<number>();
  readonly max = input.required<number | null>();

  protected readonly plein = computed(() => this.max() !== null && this.utilises() >= (this.max() ?? 0));
  protected readonly classe = computed(() => (this.plein() ? 'bg-warn-100 text-warn-700' : 'bg-brand-100 text-brand-800'));
  protected readonly ariaLabel = computed(() =>
    this.max() === null
      ? `${this.utilises()} gérants, nombre illimité`
      : `${this.utilises()} gérants sur ${this.max()} autorisés${this.plein() ? ', limite atteinte' : ''}`,
  );
}
