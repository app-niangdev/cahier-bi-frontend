import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatFcfa } from '../pipes/fcfa.pipe';

export interface ChartPoint {
  label: string;
  values: number[];
}

export interface ChartSerie {
  name: string;
  /** classe Tailwind de fond (ex. bg-brand-600) */
  color: string;
}

/** Histogramme simple en CSS, avec légende et tableau de données pour les lecteurs d'écran. */
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure>
      <div class="mb-3 flex flex-wrap gap-4 text-xs text-ink-600" aria-hidden="true">
        @for (serie of series(); track serie.name) {
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 rounded-sm {{ serie.color }}"></span>{{ serie.name }}
          </span>
        }
      </div>
      <div class="flex h-48 items-end gap-2 sm:gap-4" aria-hidden="true">
        @for (point of points(); track point.label) {
          <div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <div class="flex h-full w-full items-end justify-center gap-0.5 sm:gap-1">
              @for (value of point.values; track $index) {
                <div
                  class="w-full max-w-7 rounded-t transition-all {{ series()[$index]?.color }}"
                  [style.height.%]="max() ? (value / max()) * 100 : 0"
                  [title]="series()[$index]?.name + ' : ' + format(value)"
                ></div>
              }
            </div>
            <span class="text-xs text-ink-500">{{ point.label }}</span>
          </div>
        }
      </div>
      <figcaption class="sr-only">{{ caption() }}</figcaption>
      <table class="sr-only">
        <caption>{{ caption() }}</caption>
        <thead>
          <tr>
            <th scope="col">Mois</th>
            @for (serie of series(); track serie.name) {
              <th scope="col">{{ serie.name }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (point of points(); track point.label) {
            <tr>
              <th scope="row">{{ point.label }}</th>
              @for (value of point.values; track $index) {
                <td>{{ format(value) }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </figure>
  `,
})
export class BarChartComponent {
  readonly points = input.required<ChartPoint[]>();
  readonly series = input.required<ChartSerie[]>();
  readonly caption = input.required<string>();

  protected readonly max = computed(() => Math.max(0, ...this.points().flatMap((p) => p.values)));

  protected format(value: number): string {
    return formatFcfa(value);
  }
}
