import { ChangeDetectionStrategy, Component, computed, effect, inject, input, numberAttribute, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { ConfirmService } from '../../../shared/components/confirm/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { MontantComponent } from '../../../shared/components/montant.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { StatutBadgeComponent } from '../../../shared/components/statut-badge.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { MethodePaiementPipe } from '../../../shared/pipes/methode-paiement.pipe';
import { TelephonePipe } from '../../../shared/pipes/telephone.pipe';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { Loadable } from '../../../shared/utils/loadable';
import { EncaissementPayload } from '../../paiements/domain/paiement.model';
import { VERSEMENT_REPOSITORY } from '../../paiements/domain/versement.repository';
import { EncaissementDialogComponent } from '../../paiements/presentation/encaissement-dialog.component';
import { estOuverte } from '../domain/dette-rules';
import { DetteDetail } from '../domain/dette.model';
import { DETTE_REPOSITORY } from '../domain/dette.repository';

@Component({
  selector: 'app-dette-detail-page',
  imports: [
    RouterLink,
    PageHeaderComponent,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    StatutBadgeComponent,
    MontantComponent,
    IconComponent,
    EncaissementDialogComponent,
    DateFrPipe,
    MethodePaiementPipe,
    TelephonePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (dette.initialLoading()) {
      <app-page-header title="Dette" backLink="/app/dettes" backLabel="Dettes" />
      <app-skeleton variant="detail" [rows]="4" />
    } @else if (dette.error()) {
      <app-page-header title="Dette" backLink="/app/dettes" backLabel="Dettes" />
      <app-error-state [message]="dette.error()" (retry)="dette.reload()" />
    } @else if (dette.data(); as d) {
      <app-page-header [title]="'Dette ' + d.reference" [subtitle]="d.client.nom" backLink="/app/dettes" backLabel="Dettes">
        @if (ouverte()) {
          <button type="button" class="btn btn-primary" (click)="payerOpen.set(true)"><app-icon name="wallet" [size]="18" /> Payer</button>
          <a routerLink="/app/rappels" [queryParams]="{ dette: d.id }" class="btn btn-secondary"><app-icon name="bell" [size]="18" /> Rappel</a>
        }
        @if (d.statut !== 'annulee') {
          <a [routerLink]="['/app/dettes', d.id, 'modifier']" class="btn btn-secondary"><app-icon name="edit" [size]="18" /> Modifier</a>
        }
        <!-- Annulation : réservée au propriétaire -->
        @if (auth.isProprietaire() && d.statut !== 'annulee') {
          <button type="button" class="btn btn-secondary text-danger-700" [disabled]="action.pending()" (click)="annuler(d)">
            <app-icon name="ban" [size]="18" /> Annuler la dette
          </button>
        }
      </app-page-header>

      <div class="grid gap-6 lg:grid-cols-3">
        <section class="card h-fit p-5" aria-label="Résumé de la dette">
          <div class="flex items-center justify-between">
            <app-statut-badge [statut]="d.statut" />
            <span class="text-xs text-ink-500">Créée le {{ d.date_creation | dateFr }}</span>
          </div>
          <dl class="mt-5 space-y-3 text-sm">
            <div class="flex justify-between"><dt class="text-ink-500">Montant</dt><dd class="font-semibold"><app-montant [value]="d.montant" /></dd></div>
            <div class="flex justify-between"><dt class="text-ink-500">Déjà payé</dt><dd class="font-semibold"><app-montant [value]="d.montant_paye" tone="paye" /></dd></div>
            <div class="flex justify-between border-t border-ink-100 pt-3">
              <dt class="font-medium text-ink-700">Reste dû</dt>
              <dd class="text-lg font-bold">
                @if (d.statut === 'annulee') {
                  <span class="text-ink-500">Annulée</span>
                } @else {
                  <app-montant [value]="d.montant_restant" tone="du" />
                }
              </dd>
            </div>
          </dl>
          <div class="mt-4 h-2 overflow-hidden rounded-full bg-ink-100" role="progressbar" [attr.aria-valuenow]="progression()" aria-valuemin="0" aria-valuemax="100" aria-label="Part payée">
            <div class="h-full rounded-full bg-brand-600" [style.width.%]="progression()"></div>
          </div>
          <p class="mt-1 text-xs text-ink-500">{{ progression() }} % payé</p>

          <dl class="mt-5 space-y-2 border-t border-ink-100 pt-4 text-sm">
            <div class="flex justify-between gap-3"><dt class="text-ink-500">Échéance</dt><dd>{{ d.date_echeance ? (d.date_echeance | dateFr: 'long') : 'Non définie' }}</dd></div>
            <div class="flex justify-between gap-3">
              <dt class="text-ink-500">Client</dt>
              <dd><a [routerLink]="['/app/clients', d.client.id]" class="link">{{ d.client.nom }}</a></dd>
            </div>
            <div class="flex justify-between gap-3"><dt class="text-ink-500">Téléphone</dt><dd>{{ (d.client.telephone | telephone) || '—' }}</dd></div>
            @if (d.note) {
              <div><dt class="text-ink-500">Note</dt><dd class="mt-0.5">{{ d.note }}</dd></div>
            }
          </dl>
        </section>

        <section class="card p-5 lg:col-span-2" aria-labelledby="paiements-title">
          <h2 id="paiements-title" class="mb-3 font-semibold text-ink-900">Paiements ({{ d.paiements.length }})</h2>
          @if (d.paiements.length === 0) {
            <app-empty-state icon="wallet" title="Aucun paiement" [message]="ouverte() ? 'Encaissez un premier paiement avec le bouton « Payer ».' : null">
              @if (ouverte()) {
                <button type="button" class="btn btn-primary" (click)="payerOpen.set(true)">Payer</button>
              }
            </app-empty-state>
          } @else {
            <ul class="divide-y divide-ink-100">
              @for (p of d.paiements; track p.id) {
                <li class="flex flex-wrap items-center gap-3 py-3">
                  <span class="flex h-9 w-9 items-center justify-center rounded-full bg-ok-100 text-ok-700"><app-icon name="check" [size]="18" /></span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-ink-900">{{ p.date_paiement | dateFr }} · {{ p.methode | methodePaiement }}</p>
                    <p class="text-xs text-ink-500">
                      @if (p.reference) {
                        Réf. {{ p.reference }} ·
                      }
                      {{ p.note ?? 'Paiement' }}
                    </p>
                  </div>
                  <app-montant [value]="p.montant" tone="paye" [strong]="true" />
                  @if (auth.isProprietaire()) {
                    <button type="button" class="btn btn-ghost btn-sm text-danger-700" [disabled]="action.pending()" (click)="annulerVersement(p.versement, p.montant)">
                      <app-icon name="undo" [size]="14" /> Annuler le versement
                    </button>
                  }
                </li>
              }
            </ul>
          }
        </section>
      </div>

      <app-encaissement-dialog
        [open]="payerOpen()"
        title="Payer la dette"
        [subtitle]="d.reference + ' · ' + d.client.nom"
        [dettes]="[d]"
        [pending]="action.pending()"
        (submitted)="payer(d.id, $event)"
        (closed)="payerOpen.set(false)"
      />
    }
  `,
})
export class DetteDetailPage {
  private readonly repo = inject(DETTE_REPOSITORY);
  private readonly versements = inject(VERSEMENT_REPOSITORY);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthStore);
  protected readonly action = new ActionRunner(inject(ToastService));

  readonly id = input.required({ transform: numberAttribute });
  protected readonly dette = new Loadable<DetteDetail>();
  protected readonly payerOpen = signal(false);

  protected readonly ouverte = computed(() => {
    const d = this.dette.data();
    return !!d && estOuverte(d);
  });
  protected readonly progression = computed(() => {
    const d = this.dette.data();
    return d && d.montant > 0 ? Math.round((d.montant_paye / d.montant) * 100) : 0;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.dette.load(() => this.repo.get(id)));
    });
  }

  protected payer(id: number, payload: EncaissementPayload): void {
    this.action.run(this.repo.payer(id, payload), {
      success: (r) => {
        const ligne = r.repartition[0];
        return ligne?.statut === 'payee' ? 'Paiement enregistré : la dette est soldée.' : `Paiement enregistré. Reste dû : ${new Intl.NumberFormat('fr-FR').format(ligne?.montant_restant ?? 0)} FCFA.`;
      },
      onSuccess: () => {
        this.payerOpen.set(false);
        this.dette.reload(true);
      },
    });
  }

  protected async annuler(d: DetteDetail): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Annuler la dette ${d.reference} ?`,
      message:
        d.paiements.length > 0
          ? 'Cette dette a déjà reçu des paiements : annulez d’abord les versements concernés, sinon l’annulation sera refusée.'
          : 'La dette ne comptera plus dans le total dû du client. Cette action est définitive.',
      confirmLabel: 'Annuler la dette',
      cancelLabel: 'Garder',
    });
    if (!ok) return;
    this.action.run(this.repo.annuler(d.id), { success: 'Dette annulée.', onSuccess: () => this.dette.reload(true) });
  }

  protected async annulerVersement(versement: string, montant: number): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Annuler le versement entier ?',
      message: `Ce paiement de ${new Intl.NumberFormat('fr-FR').format(montant)} FCFA fait partie d’un versement : toutes ses lignes (y compris sur d’autres dettes) seront supprimées.`,
      confirmLabel: 'Annuler le versement',
      cancelLabel: 'Garder',
    });
    if (!ok) return;
    this.action.run(this.versements.annuler(versement), {
      success: 'Versement annulé : les dettes ont été recalculées.',
      onSuccess: () => this.dette.reload(true),
    });
  }
}
