import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent } from './icon.component';

let nextId = 0;

@Component({
  selector: 'app-search-input',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [for]="id" class="sr-only">{{ label() }}</label>
    <div class="relative">
      <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400">
        <app-icon name="search" [size]="18" />
      </span>
      <input
        [id]="id"
        type="search"
        class="input pl-10"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="value.set($any($event.target).value)"
        autocomplete="off"
      />
    </div>
  `,
})
export class SearchInputComponent {
  readonly value = model('');
  readonly label = input('Rechercher');
  readonly placeholder = input('Rechercher…');
  protected readonly id = `search-${++nextId}`;
}
