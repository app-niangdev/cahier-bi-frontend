import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

export type Tone = 'brand' | 'danger' | 'warn' | 'info' | 'ok' | 'neutral';

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-700',
  danger: 'bg-danger-100 text-danger-700',
  warn: 'bg-warn-100 text-warn-700',
  info: 'bg-info-100 text-info-700',
  ok: 'bg-ok-100 text-ok-700',
  neutral: 'bg-ink-100 text-ink-700',
};

@Component({
  selector: 'app-stat-card',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card flex h-full items-start gap-3 p-4 sm:p-5 xl:gap-4">
      <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg {{ tones[tone()] }}">
        <app-icon [name]="icon()" />
      </div>
      <div class="min-w-0">
        <p class="text-sm font-medium text-ink-600">{{ label() }}</p>
        <p class="mt-0.5 text-xl font-bold break-words text-ink-900 tabular-nums 2xl:text-2xl">{{ value() }}</p>
        @if (hint()) {
          <p class="mt-0.5 text-xs text-ink-500">{{ hint() }}</p>
        }
      </div>
    </div>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string | null>(null);
  readonly icon = input<IconName>('dashboard');
  readonly tone = input<Tone>('brand');
  protected readonly tones = TONES;
}
