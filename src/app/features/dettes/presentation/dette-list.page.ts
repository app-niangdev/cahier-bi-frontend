import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { NoBoutiqueComponent } from '../../../core/boutique/no-boutique.component';
import { DETTE_STATUT_LABELS, DetteStatut, toOptions } from '../../../core/domain/enums';
import { CellDirective, DataTableComponent, TableColumn } from '../../../shared/components/data-table.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { FilterSelectComponent } from '../../../shared/components/filter-select.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { MontantComponent } from '../../../shared/components/montant.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SearchInputComponent } from '../../../shared/components/search-input.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { StatutBadgeComponent } from '../../../shared/components/statut-badge.component';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { DettesStore, Periode } from './dettes.store';

@Component({
  selector: 'app-dette-list-page',
  imports: [
    RouterLink,
    PageHeaderComponent,
    SearchInputComponent,
    FilterSelectComponent,
    DataTableComponent,
    CellDirective,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    NoBoutiqueComponent,
    StatutBadgeComponent,
    MontantComponent,
    IconComponent,
    DateFrPipe,
    FcfaPipe,
  ],
  providers: [DettesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Dettes" [subtitle]="ctx.current()?.nom ?? null">
      <a routerLink="/app/dettes/nouvelle" class="btn btn-primary"><app-icon name="plus" [size]="18" /> Nouvelle dette</a>
    </app-page-header>

    @if (!ctx.current()) {
      <app-no-boutique />
    } @else {
      <!-- Filtres rapides par statut -->
      <div class="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer par statut">
        <button type="button" class="chip shrink-0 border px-3 py-1.5" [class]="chipClass('')" [attr.aria-pressed]="store.statut() === ''" (click)="store.statut.set('')">
          Toutes
        </button>
        @for (s of statuts; track s.value) {
          <button type="button" class="chip shrink-0 border px-3 py-1.5" [class]="chipClass(s.value)" [attr.aria-pressed]="store.statut() === s.value" (click)="store.statut.set(s.value)">
            {{ s.label }}
          </button>
        }
      </div>

      <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <app-search-input label="Rechercher une dette" placeholder="Référence ou client…" [(value)]="store.recherche" />
        <app-filter-select label="Client" allLabel="Tous les clients" [options]="clientOptions()" [value]="store.clientId()?.toString() ?? ''" (valueChange)="store.clientId.set($event ? +$event : null)" />
        <app-filter-select label="Période" allLabel="Toute période" [options]="periodes" [value]="store.periode()" (valueChange)="store.periode.set($any($event))" />
        @if (store.periode() === 'perso') {
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label for="du" class="sr-only">Du</label>
              <input id="du" type="date" class="input" [value]="store.du()" (change)="store.du.set($any($event.target).value)" />
            </div>
            <div>
              <label for="au" class="sr-only">Au</label>
              <input id="au" type="date" class="input" [value]="store.au()" (change)="store.au.set($any($event.target).value)" />
            </div>
          </div>
        } @else if (store.filtresActifs()) {
          <button type="button" class="btn btn-ghost justify-self-start" (click)="store.reinitialiser()"><app-icon name="x" [size]="16" /> Effacer les filtres</button>
        }
      </div>

      @if (store.dettes.initialLoading()) {
        <app-skeleton [rows]="8" />
      } @else if (store.dettes.error() || store.clients.error()) {
        <app-error-state [message]="store.dettes.error() ?? store.clients.error()" (retry)="store.recharger()" />
      } @else if (store.resultats().length === 0) {
        <div class="card">
          @if (store.filtresActifs()) {
            <app-empty-state icon="search" title="Aucune dette trouvée" message="Aucune dette ne correspond à ces filtres.">
              <button type="button" class="btn btn-secondary" (click)="store.reinitialiser()">Effacer les filtres</button>
            </app-empty-state>
          } @else {
            <app-empty-state icon="book" title="Aucune dette" message="Notez le premier achat à crédit d'un client.">
              <a routerLink="/app/dettes/nouvelle" class="btn btn-primary">Nouvelle dette</a>
            </app-empty-state>
          }
        </div>
      } @else {
        <p class="mb-3 text-sm text-ink-600" aria-live="polite" [class.opacity-60]="store.dettes.loading()">
          {{ store.resultats().length }} dette{{ store.resultats().length > 1 ? 's' : '' }} · reste à encaisser {{ store.totaux().restant | fcfa }} sur
          {{ store.totaux().montant | fcfa }}
        </p>
        <div [class.opacity-60]="store.dettes.loading()" [attr.aria-busy]="store.dettes.loading()">
          <app-data-table caption="Liste des dettes" [rows]="store.resultats()" [columns]="columns" [dimmed]="estAnnulee">
            <ng-template appCell="reference" let-d>
              <a [routerLink]="['/app/dettes', d.id]" class="font-medium text-ink-900 hover:underline">{{ d.reference }}</a>
              <span class="block text-xs text-ink-500">{{ d.client?.nom }}</span>
            </ng-template>
            <ng-template appCell="date_creation" let-d>{{ d.date_creation | dateFr }}</ng-template>
            <ng-template appCell="date_echeance" let-d>{{ d.date_echeance ? (d.date_echeance | dateFr) : '—' }}</ng-template>
            <ng-template appCell="statut" let-d><app-statut-badge [statut]="d.statut" /></ng-template>
            <ng-template appCell="montant" let-d><app-montant [value]="d.montant" /></ng-template>
            <ng-template appCell="montant_restant" let-d>
              @if (d.statut === 'annulee') {
                <span class="text-ink-500">—</span>
              } @else {
                <app-montant [value]="d.montant_restant" tone="du" [strong]="true" />
              }
            </ng-template>
            <ng-template appCell="actions" let-d>
              <a [routerLink]="['/app/dettes', d.id]" class="btn btn-secondary btn-sm" [attr.aria-label]="'Voir la dette ' + d.reference">Détail</a>
            </ng-template>
          </app-data-table>
        </div>
      }
    }
  `,
})
export class DetteListPage {
  protected readonly store = inject(DettesStore);
  protected readonly ctx = inject(BoutiqueContextStore);

  /** Filtres initiaux par l'URL : /app/dettes?statut=en_retard&client=12 */
  readonly statut = input<string | undefined>();
  readonly client = input<string | undefined>();

  protected readonly statuts = toOptions(DETTE_STATUT_LABELS);
  protected readonly periodes: { value: Periode; label: string }[] = [
    { value: '7j', label: '7 derniers jours' },
    { value: '30j', label: '30 derniers jours' },
    { value: 'mois', label: 'Ce mois-ci' },
    { value: '90j', label: '3 derniers mois' },
    { value: 'perso', label: 'Personnalisée…' },
  ];
  protected readonly columns: TableColumn[] = [
    { key: 'reference', label: 'Dette / client', mobile: 'title' },
    { key: 'date_creation', label: 'Créée le' },
    { key: 'date_echeance', label: 'Échéance' },
    { key: 'statut', label: 'Statut' },
    { key: 'montant', label: 'Montant', align: 'right' },
    { key: 'montant_restant', label: 'Reste dû', align: 'right', mobile: 'value' },
    { key: 'actions', label: 'Actions', align: 'right', mobile: 'footer' },
  ];
  protected readonly clientOptions = computed(() =>
    (this.store.clients.data() ?? []).map((c) => ({ value: String(c.id), label: c.nom })),
  );
  protected readonly estAnnulee = (d: { statut: DetteStatut }) => d.statut === 'annulee';

  constructor() {
    effect(() => {
      const statut = this.statut();
      const client = this.client();
      untracked(() => {
        if (statut && statut in DETTE_STATUT_LABELS) this.store.statut.set(statut as DetteStatut);
        if (client) this.store.clientId.set(Number(client));
      });
    });
  }

  protected chipClass(value: DetteStatut | ''): string {
    return this.store.statut() === value ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 bg-white text-ink-700 hover:bg-ink-100';
  }
}
