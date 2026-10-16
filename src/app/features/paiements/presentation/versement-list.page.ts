import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthStore } from '../../../core/auth/auth.store';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { NoBoutiqueComponent } from '../../../core/boutique/no-boutique.component';
import { METHODE_PAIEMENT_LABELS, MethodePaiement, toOptions } from '../../../core/domain/enums';
import { addDays, startOfMonthIso, todayIso } from '../../../core/utils/dates';
import { ConfirmService } from '../../../shared/components/confirm/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { FilterSelectComponent } from '../../../shared/components/filter-select.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SearchInputComponent } from '../../../shared/components/search-input.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { Loadable } from '../../../shared/utils/loadable';
import { Versement } from '../domain/paiement.model';
import { VERSEMENT_REPOSITORY } from '../domain/versement.repository';
import { VersementCardComponent } from './versement-card.component';

type Periode = '' | '7j' | 'mois' | '90j';

/** Historique des versements de la boutique ; annulation d'un versement entier par le propriétaire. */
@Component({
  selector: 'app-versement-list-page',
  imports: [
    PageHeaderComponent,
    SearchInputComponent,
    FilterSelectComponent,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    NoBoutiqueComponent,
    StatCardComponent,
    VersementCardComponent,
    FcfaPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Versements" subtitle="Tous les paiements encaissés, regroupés par versement" />

    @if (!ctx.current()) {
      <app-no-boutique />
    } @else {
      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        <app-search-input label="Rechercher un versement" placeholder="Client ou référence…" [(value)]="recherche" />
        <app-filter-select label="Période" allLabel="Toute période" [options]="periodes" [value]="periode()" (valueChange)="periode.set($any($event))" />
        <app-filter-select label="Méthode" allLabel="Toutes les méthodes" [options]="methodes" [value]="methode()" (valueChange)="methode.set($any($event))" />
      </div>

      @if (versements.initialLoading()) {
        <app-skeleton [rows]="6" />
      } @else if (versements.error()) {
        <app-error-state [message]="versements.error()" (retry)="versements.reload()" />
      } @else {
        <div class="mb-4 grid gap-4 sm:grid-cols-3">
          <app-stat-card label="Total encaissé" [value]="total() | fcfa" icon="wallet" tone="ok" />
          <app-stat-card label="Versements" [value]="resultats().length" icon="card" tone="info" />
          <app-stat-card label="Versements globaux" [value]="nbGlobaux()" icon="transfer" tone="brand" hint="répartis sur plusieurs dettes" />
        </div>
        @if (!auth.isProprietaire()) {
          <p class="mb-3 rounded-lg bg-info-50 p-3 text-sm text-info-700">Seul le propriétaire peut annuler un versement.</p>
        }
        @if (resultats().length === 0) {
          <div class="card">
            <app-empty-state icon="wallet" title="Aucun versement" message="Aucun paiement ne correspond à ces critères." />
          </div>
        } @else {
          <ul class="card divide-y divide-ink-100 p-0" aria-label="Versements">
            @for (v of resultats(); track v.versement) {
              <li class="p-3 sm:p-4">
                <app-versement-card [v]="v" [showClient]="true" [canCancel]="auth.isProprietaire()" [pending]="action.pending()" (annuler)="annuler($event)" />
              </li>
            }
          </ul>
        }
      }
    }
  `,
})
export class VersementListPage {
  private readonly repo = inject(VERSEMENT_REPOSITORY);
  private readonly confirm = inject(ConfirmService);
  protected readonly ctx = inject(BoutiqueContextStore);
  protected readonly auth = inject(AuthStore);
  protected readonly action = new ActionRunner(inject(ToastService));

  protected readonly versements = new Loadable<Versement[]>();
  protected readonly recherche = signal('');
  protected readonly periode = signal<Periode>('');
  protected readonly methode = signal<MethodePaiement | ''>('');

  protected readonly periodes = [
    { value: '7j', label: '7 derniers jours' },
    { value: 'mois', label: 'Ce mois-ci' },
    { value: '90j', label: '3 derniers mois' },
  ];
  protected readonly methodes = toOptions(METHODE_PAIEMENT_LABELS);

  protected readonly resultats = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    const m = this.methode();
    return (this.versements.data() ?? []).filter(
      (v) =>
        (!m || v.methode === m) &&
        (!q || v.client_nom.toLowerCase().includes(q) || (v.reference ?? '').toLowerCase().includes(q) || v.lignes.some((l) => l.dette_reference.toLowerCase().includes(q))),
    );
  });
  protected readonly total = computed(() => this.resultats().reduce((s, v) => s + v.montant, 0));
  protected readonly nbGlobaux = computed(() => this.resultats().filter((v) => v.lignes.length > 1).length);

  constructor() {
    effect(() => {
      const boutiqueId = this.ctx.currentId();
      const periode = this.periode();
      untracked(() => {
        if (!boutiqueId) return this.versements.reset();
        const today = todayIso();
        const du = periode === '7j' ? addDays(today, -6) : periode === 'mois' ? startOfMonthIso(today) : periode === '90j' ? addDays(today, -89) : null;
        this.versements.load(() => this.repo.list(boutiqueId, { du }), { keepData: true });
      });
    });
  }

  protected async annuler(v: Versement): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Annuler ce versement ?',
      message: `Versement de ${v.client_nom} (${new Intl.NumberFormat('fr-FR').format(v.montant)} FCFA, ${v.lignes.length} ligne(s)). Les dettes concernées redeviendront dues.`,
      confirmLabel: 'Annuler le versement',
      cancelLabel: 'Garder',
    });
    if (!ok) return;
    this.action.run(this.repo.annuler(v.versement), {
      success: 'Versement annulé : les dettes ont été recalculées.',
      onSuccess: () => this.versements.reload(true),
    });
  }
}
