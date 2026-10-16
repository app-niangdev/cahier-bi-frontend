import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { NoBoutiqueComponent } from '../../../core/boutique/no-boutique.component';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { CellDirective, DataTableComponent, TableColumn } from '../../../shared/components/data-table.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { FilterOption, FilterSelectComponent } from '../../../shared/components/filter-select.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { MontantComponent } from '../../../shared/components/montant.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SearchInputComponent } from '../../../shared/components/search-input.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { TelephonePipe } from '../../../shared/pipes/telephone.pipe';
import { ClientFiltre } from '../domain/client.model';
import { ClientsStore } from './clients.store';

@Component({
  selector: 'app-client-list-page',
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
    AvatarComponent,
    MontantComponent,
    IconComponent,
    TelephonePipe,
    FcfaPipe,
  ],
  providers: [ClientsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Clients" [subtitle]="ctx.current()?.nom ?? null">
      <a routerLink="/app/clients/nouveau" class="btn btn-primary"><app-icon name="plus" [size]="18" /> Nouveau client</a>
    </app-page-header>

    @if (!ctx.current()) {
      <app-no-boutique />
    } @else {
      <div class="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <app-search-input label="Rechercher un client" placeholder="Nom ou numéro de téléphone…" [(value)]="store.recherche" />
        <app-filter-select label="Filtrer les clients" allLabel="Tous les clients" [options]="filtres" [value]="store.filtre()" (valueChange)="store.filtre.set($any($event))" />
        <div class="sm:w-52">
          <label for="tri-clients" class="sr-only">Trier</label>
          <select id="tri-clients" class="input" [value]="triValue()" (change)="trier($any($event.target).value)">
            <option value="total_du:desc">Montant dû (décroissant)</option>
            <option value="total_du:asc">Montant dû (croissant)</option>
            <option value="nom:asc">Nom (A → Z)</option>
            <option value="nom:desc">Nom (Z → A)</option>
          </select>
        </div>
      </div>

      @if (store.clients.initialLoading()) {
        <app-skeleton [rows]="6" />
      } @else if (store.clients.error()) {
        <app-error-state [message]="store.clients.error()" (retry)="store.clients.reload()" />
      } @else if (store.resultats().length === 0) {
        <div class="card">
          @if ((store.clients.data() ?? []).length === 0) {
            <app-empty-state icon="users" title="Aucun client" message="Ajoutez votre premier client pour commencer à noter ses achats à crédit.">
              <a routerLink="/app/clients/nouveau" class="btn btn-primary">Ajouter un client</a>
            </app-empty-state>
          } @else {
            <app-empty-state icon="search" title="Aucun résultat" message="Aucun client ne correspond à votre recherche ou à ce filtre.">
              <button type="button" class="btn btn-secondary" (click)="reinitialiser()">Effacer les filtres</button>
            </app-empty-state>
          }
        </div>
      } @else {
        <p class="mb-3 text-sm text-ink-600" aria-live="polite">
          {{ store.resultats().length }} client{{ store.resultats().length > 1 ? 's' : '' }} · total dû {{ store.totalDu() | fcfa }}
        </p>
        <app-data-table caption="Liste des clients" [rows]="store.resultats()" [columns]="columns" [(sort)]="store.tri">
          <ng-template appCell="nom" let-c>
            <a [routerLink]="['/app/clients', c.id]" class="flex items-center gap-3 hover:underline">
              <app-avatar [name]="c.nom" [size]="34" />
              <span class="font-medium text-ink-900">{{ c.nom }}</span>
            </a>
          </ng-template>
          <ng-template appCell="telephone" let-c>{{ (c.telephone | telephone) || '—' }}</ng-template>
          <ng-template appCell="nb_dettes_ouvertes" let-c>
            @if (c.nb_dettes_ouvertes > 0) {
              {{ c.nb_dettes_ouvertes }}
              @if (c.nb_dettes_en_retard > 0) {
                <span class="chip ml-1 bg-statut-retard-bg text-statut-retard-fg">{{ c.nb_dettes_en_retard }} en retard</span>
              }
            } @else {
              <span class="chip bg-statut-payee-bg text-statut-payee-fg">À jour</span>
            }
          </ng-template>
          <ng-template appCell="total_du" let-c><app-montant [value]="c.total_du" tone="du" [strong]="true" /></ng-template>
          <ng-template appCell="actions" let-c>
            <a [routerLink]="['/app/clients', c.id]" class="btn btn-secondary btn-sm" [attr.aria-label]="'Voir la fiche de ' + c.nom">Voir la fiche</a>
          </ng-template>
        </app-data-table>
      }
    }
  `,
})
export class ClientListPage {
  protected readonly store = inject(ClientsStore);
  protected readonly ctx = inject(BoutiqueContextStore);

  protected readonly filtres: FilterOption[] = [
    { value: 'avec_dette', label: 'Avec dette' },
    { value: 'a_jour', label: 'À jour' },
    { value: 'en_retard', label: 'En retard' },
  ];

  protected readonly columns: TableColumn[] = [
    { key: 'nom', label: 'Client', sortable: true, mobile: 'title' },
    { key: 'telephone', label: 'Téléphone' },
    { key: 'nb_dettes_ouvertes', label: 'Dettes ouvertes', align: 'center' },
    { key: 'total_du', label: 'Montant dû', align: 'right', sortable: true, mobile: 'value' },
    { key: 'actions', label: 'Actions', align: 'right', mobile: 'footer' },
  ];

  protected triValue(): string {
    const tri = this.store.tri();
    return tri ? `${tri.key}:${tri.dir}` : 'total_du:desc';
  }

  protected trier(value: string): void {
    const [key, dir] = value.split(':');
    this.store.tri.set({ key, dir: dir as 'asc' | 'desc' });
  }

  protected reinitialiser(): void {
    this.store.recherche.set('');
    this.store.filtre.set('' as ClientFiltre | '');
  }
}
