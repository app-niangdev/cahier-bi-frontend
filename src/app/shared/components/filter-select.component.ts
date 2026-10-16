import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface FilterOption {
  value: string;
  label: string;
}

let nextId = 0;

/** Filtre déroulant avec libellé accessible. Valeur '' = tous. */
@Component({
  selector: 'app-filter-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [for]="id" [class]="showLabel() ? 'label' : 'sr-only'">{{ label() }}</label>
    <select [id]="id" class="input" [value]="value()" (change)="value.set($any($event.target).value)">
      <option value="">{{ allLabel() }}</option>
      @for (opt of options(); track opt.value) {
        <option [value]="opt.value" [selected]="opt.value === value()">{{ opt.label }}</option>
      }
    </select>
  `,
})
export class FilterSelectComponent {
  readonly value = model('');
  readonly label = input.required<string>();
  readonly options = input.required<FilterOption[]>();
  readonly allLabel = input('Tous');
  readonly showLabel = input(false);
  protected readonly id = `filter-${++nextId}`;
}
