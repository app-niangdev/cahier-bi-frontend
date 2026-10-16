import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Directive, TemplateRef, computed, contentChildren, inject, input, model } from '@angular/core';
import { IconComponent } from './icon.component';

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  /** Rôle de la colonne dans la carte mobile */
  mobile?: 'title' | 'value' | 'row' | 'footer' | 'hidden';
}

export interface TableSort {
  key: string;
  dir: 'asc' | 'desc';
}

export interface CellContext<T> {
  $implicit: T;
}

/** Gabarit d'une cellule : `<ng-template appCell="montant" let-row>…</ng-template>`. */
@Directive({ selector: 'ng-template[appCell]' })
export class CellDirective {
  readonly appCell = input.required<string>();
  readonly template = inject<TemplateRef<CellContext<unknown>>>(TemplateRef);
}

/**
 * Tableau responsive : tableau classique à partir de md, cartes empilées sur mobile.
 * Les cellules sont personnalisées par des <ng-template appCell="clé">.
 */
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Bureau -->
    <div class="card hidden overflow-x-auto md:block">
      <table class="w-full text-sm">
        <caption class="sr-only">{{ caption() }}</caption>
        <thead class="border-b border-ink-200 bg-ink-50">
          <tr>
            @for (col of columns(); track col.key) {
              <th
                scope="col"
                class="px-4 py-3 text-xs font-semibold tracking-wide text-ink-600 uppercase {{ alignClass(col) }}"
                [attr.aria-sort]="ariaSort(col)"
              >
                @if (col.sortable) {
                  <button type="button" class="inline-flex items-center gap-1 uppercase hover:text-ink-900" (click)="toggleSort(col)">
                    {{ col.label }}
                    <app-icon [name]="sort()?.key === col.key ? 'chevron-down' : 'sort'" [size]="14" [class.rotate-180]="sort()?.key === col.key && sort()?.dir === 'asc'" />
                  </button>
                } @else {
                  {{ col.label }}
                }
              </th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-ink-100">
          @for (row of rows(); track trackBy()(row)) {
            <tr class="hover:bg-ink-50" [class.opacity-60]="dimmed()(row)">
              @for (col of columns(); track col.key) {
                <td class="px-4 py-3 align-middle {{ alignClass(col) }}">
                  <ng-container *ngTemplateOutlet="cell(col.key) ?? defaultCell; context: { $implicit: row, key: col.key }" />
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Mobile -->
    <ul class="space-y-3 md:hidden" [attr.aria-label]="caption()">
      @for (row of rows(); track trackBy()(row)) {
        <li class="card p-4" [class.opacity-60]="dimmed()(row)">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1 font-medium text-ink-900">
              @if (titleCol(); as col) {
                <ng-container *ngTemplateOutlet="cell(col.key) ?? defaultCell; context: { $implicit: row, key: col.key }" />
              }
            </div>
            @if (valueCol(); as col) {
              <div class="text-right">
                <ng-container *ngTemplateOutlet="cell(col.key) ?? defaultCell; context: { $implicit: row, key: col.key }" />
              </div>
            }
          </div>
          @if (rowCols().length) {
            <dl class="mt-2 space-y-1 text-sm">
              @for (col of rowCols(); track col.key) {
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-ink-500">{{ col.label }}</dt>
                  <dd class="text-right text-ink-800">
                    <ng-container *ngTemplateOutlet="cell(col.key) ?? defaultCell; context: { $implicit: row, key: col.key }" />
                  </dd>
                </div>
              }
            </dl>
          }
          @for (col of footerCols(); track col.key) {
            <div class="mt-3 flex flex-wrap justify-end gap-2 border-t border-ink-100 pt-3">
              <ng-container *ngTemplateOutlet="cell(col.key) ?? defaultCell; context: { $implicit: row, key: col.key }" />
            </div>
          }
        </li>
      }
    </ul>

    <ng-template #defaultCell let-row let-key="key">{{ valueOf(row, key) }}</ng-template>
  `,
})
export class DataTableComponent<T extends object> {
  readonly rows = input.required<T[]>();
  readonly columns = input.required<TableColumn[]>();
  readonly caption = input.required<string>();
  readonly trackBy = input<(row: T) => unknown>((row) => (row as { id?: unknown }).id ?? row);
  readonly dimmed = input<(row: T) => boolean>(() => false);
  readonly sort = model<TableSort | null>(null);

  private readonly cells = contentChildren(CellDirective);
  private readonly cellMap = computed(() => new Map(this.cells().map((c) => [c.appCell(), c.template])));

  protected readonly titleCol = computed(() => this.columns().find((c) => c.mobile === 'title') ?? this.columns()[0]);
  protected readonly valueCol = computed(() => this.columns().find((c) => c.mobile === 'value'));
  protected readonly rowCols = computed(() =>
    this.columns().filter((c) => c !== this.titleCol() && (c.mobile ?? 'row') === 'row'),
  );
  protected readonly footerCols = computed(() => this.columns().filter((c) => c.mobile === 'footer'));

  protected cell(key: string): TemplateRef<unknown> | null {
    return (this.cellMap().get(key) as TemplateRef<unknown> | undefined) ?? null;
  }

  protected valueOf(row: T, key: string): unknown {
    return (row as Record<string, unknown>)[key] ?? '—';
  }

  protected alignClass(col: TableColumn): string {
    return col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
  }

  protected ariaSort(col: TableColumn): string | null {
    if (!col.sortable) return null;
    const sort = this.sort();
    if (sort?.key !== col.key) return 'none';
    return sort.dir === 'asc' ? 'ascending' : 'descending';
  }

  protected toggleSort(col: TableColumn): void {
    const sort = this.sort();
    this.sort.set({ key: col.key, dir: sort?.key === col.key && sort.dir === 'desc' ? 'asc' : 'desc' });
  }
}
