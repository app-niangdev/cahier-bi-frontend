import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Squelettes de chargement : cartes de stats, liste/tableau ou fiche détail. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', 'aria-live': 'polite' },
  template: `
    <span class="sr-only">Chargement…</span>
    @switch (variant()) {
      @case ('stats') {
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
          @for (i of items(); track i) {
            <div class="card flex items-center gap-4 p-5">
              <div class="skeleton h-11 w-11 rounded-lg"></div>
              <div class="flex-1 space-y-2">
                <div class="skeleton h-3 w-2/3"></div>
                <div class="skeleton h-6 w-1/2"></div>
              </div>
            </div>
          }
        </div>
      }
      @case ('detail') {
        <div class="grid gap-6 lg:grid-cols-3" aria-hidden="true">
          <div class="card space-y-3 p-5">
            <div class="skeleton h-14 w-14 rounded-full"></div>
            <div class="skeleton h-4 w-2/3"></div>
            <div class="skeleton h-3 w-1/2"></div>
            <div class="skeleton h-20 w-full"></div>
          </div>
          <div class="card space-y-3 p-5 lg:col-span-2">
            @for (i of items(); track i) {
              <div class="skeleton h-10 w-full"></div>
            }
          </div>
        </div>
      }
      @default {
        <div class="card divide-y divide-ink-100" aria-hidden="true">
          @for (i of items(); track i) {
            <div class="flex items-center gap-4 p-4">
              <div class="skeleton h-9 w-9 rounded-full"></div>
              <div class="flex-1 space-y-2">
                <div class="skeleton h-3 w-1/3"></div>
                <div class="skeleton h-3 w-1/4"></div>
              </div>
              <div class="skeleton h-4 w-20"></div>
            </div>
          }
        </div>
      }
    }
  `,
})
export class SkeletonComponent {
  readonly variant = input<'list' | 'stats' | 'detail'>('list');
  readonly rows = input(5);
  protected readonly items = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
}
