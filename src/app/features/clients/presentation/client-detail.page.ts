import { ChangeDetectionStrategy, Component, effect, inject, input, numberAttribute, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { ConfirmService } from '../../../shared/components/confirm/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { MontantComponent } from '../../../shared/components/montant.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { StatutBadgeComponent } from '../../../shared/components/statut-badge.component';
import { DateFrPipe } from '../../../shared/pipes/date-fr.pipe';
import { FcfaPipe } from '../../../shared/pipes/fcfa.pipe';
import { TelephonePipe } from '../../../shared/pipes/telephone.pipe';
import { EncaissementDialogComponent } from '../../paiements/presentation/encaissement-dialog.component';
import { VersementCardComponent } from '../../paiements/presentation/versement-card.component';
import { EncaissementPayload, Versement } from '../../paiements/domain/paiement.model';
import { ClientDetailStore } from './client-detail.store';

@Component({
  selector: 'app-client-detail-page',
  imports: [
    RouterLink,
    PageHeaderComponent,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    AvatarComponent,
    MontantComponent,
    StatutBadgeComponent,
    IconComponent,
    EncaissementDialogComponent,
    VersementCardComponent,
    TelephonePipe,
    DateFrPipe,
    FcfaPipe,
  ],
  providers: [ClientDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.fiche.initialLoading()) {
      <app-page-header title="Fiche client" backLink="/app/clients" backLabel="Clients" />
      <app-skeleton variant="detail" [rows]="5" />
    } @else if (store.fiche.error()) {
      <app-page-header title="Fiche client" backLink="/app/clients" backLabel="Clients" />
      <app-error-state [message]="store.fiche.error()" (retry)="store.fiche.reload()" />
    } @else if (store.fiche.data(); as f) {
      <app-page-header [title]="f.client.nom" backLink="/app/clients" backLabel="Clients">
        <button type="button" class="btn btn-primary" [disabled]="store.dettesOuvertes().length === 0" (click)="versementOpen.set(true)">
          <app-icon name="wallet" [size]="18" /> Encaisser un versement global
        </button>
        <a [routerLink]="['/app/dettes/nouvelle']" [queryParams]="{ client: f.client.id }" class="btn btn-secondary">
          <app-icon name="plus" [size]="18" /> Nouvelle dette
        </a>
      </app-page-header>

      <div class="grid gap-6 lg:grid-cols-3">
        <section class="card h-fit p-5" aria-label="Coordonnées du client">
          <div class="flex items-center gap-4">
            <app-avatar [name]="f.client.nom" [size]="56" />
            <div class="min-w-0">
              <h2 class="truncate text-lg font-semibold text-ink-900">{{ f.client.nom }}</h2>
              <p class="text-sm text-ink-600">{{ (f.client.telephone | telephone) || 'Pas de téléphone' }}</p>
            </div>
          </div>

          <dl class="mt-5 grid grid-cols-2 gap-3">
            <div class="rounded-lg bg-ink-50 p-3">
              <dt class="text-xs text-ink-500">Total dû</dt>
              <dd class="mt-0.5 font-bold"><app-montant [value]="f.client.total_du" tone="du" /></dd>
            </div>
            <div class="rounded-lg bg-ink-50 p-3">
              <dt class="text-xs text-ink-500">Dettes ouvertes</dt>
              <dd class="mt-0.5 font-bold text-ink-900">{{ f.client.nb_dettes_ouvertes }}</dd>
            </div>
          </dl>

          <dl class="mt-4 space-y-2 text-sm">
            <div class="flex justify-between gap-3"><dt class="text-ink-500">WhatsApp</dt><dd>{{ (f.client.whatsapp | telephone) || '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-ink-500">Adresse</dt><dd class="text-right">{{ f.client.adresse ?? '—' }}</dd></div>
            @if (f.client.note) {
              <div><dt class="text-ink-500">Note</dt><dd class="mt-0.5 text-ink-800">{{ f.client.note }}</dd></div>
            }
          </dl>

          <div class="mt-5 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
            @if (f.client.whatsapp) {
              <a class="btn btn-secondary btn-sm" [href]="'https://wa.me/' + f.client.whatsapp.replace('+', '')" target="_blank" rel="noopener">
                <app-icon name="message" [size]="14" /> WhatsApp
              </a>
            }
            <a [routerLink]="['/app/clients', f.client.id, 'modifier']" class="btn btn-secondary btn-sm"><app-icon name="edit" [size]="14" /> Modifier</a>
            <button type="button" class="btn btn-secondary btn-sm text-danger-700" [disabled]="store.action.pending()" (click)="supprimer(f.client.nom, f.client.total_du)">
              <app-icon name="trash" [size]="14" /> Supprimer
            </button>
          </div>
        </section>

        <div class="space-y-6 lg:col-span-2">
          <section class="card p-5" aria-labelledby="dettes-title">
            <h2 id="dettes-title" class="mb-3 font-semibold text-ink-900">Dettes ({{ f.dettes.length }})</h2>
            @if (f.dettes.length === 0) {
              <app-empty-state icon="book" title="Aucune dette" message="Ce client n'a encore rien acheté à crédit.">
                <a [routerLink]="['/app/dettes/nouvelle']" [queryParams]="{ client: f.client.id }" class="btn btn-primary">Noter une dette</a>
              </app-empty-state>
            } @else {
              <ul class="divide-y divide-ink-100">
                @for (d of f.dettes; track d.id) {
                  <li class="flex flex-wrap items-center gap-3 py-3">
                    <div class="min-w-0 flex-1">
                      <a [routerLink]="['/app/dettes', d.id]" class="font-medium text-ink-900 hover:underline">{{ d.reference }}</a>
                      <p class="text-xs text-ink-500">
                        Du {{ d.date_creation | dateFr }} · échéance {{ d.date_echeance ? (d.date_echeance | dateFr) : 'non définie' }}
                      </p>
                    </div>
                    <app-statut-badge [statut]="d.statut" />
                    <div class="w-32 text-right text-sm">
                      @if (d.statut === 'annulee') {
                        <span class="text-ink-500 line-through">{{ d.montant | fcfa }}</span>
                      } @else {
                        <app-montant [value]="d.montant_restant" tone="du" [strong]="true" />
                        <p class="text-xs text-ink-500">sur {{ d.montant | fcfa }}</p>
                      }
                    </div>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="card p-5" aria-labelledby="versements-title">
            <h2 id="versements-title" class="mb-3 font-semibold text-ink-900">Historique des versements</h2>
            @if (f.versements.length === 0) {
              <app-empty-state icon="wallet" title="Aucun versement" message="Les paiements de ce client apparaîtront ici." />
            } @else {
              <div class="space-y-3">
                @for (v of f.versements; track v.versement) {
                  <app-versement-card [v]="v" [canCancel]="auth.isProprietaire()" [pending]="store.action.pending()" (annuler)="annulerVersement($event)" />
                }
              </div>
            }
          </section>
        </div>
      </div>

      <app-encaissement-dialog
        [open]="versementOpen()"
        title="Encaisser un versement global"
        [subtitle]="f.client.nom"
        [dettes]="store.dettesOuvertes()"
        [global]="true"
        [pending]="store.action.pending()"
        (submitted)="encaisser($event)"
        (closed)="versementOpen.set(false)"
      />
    }
  `,
})
export class ClientDetailPage {
  protected readonly store = inject(ClientDetailStore);
  protected readonly auth = inject(AuthStore);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  readonly id = input.required({ transform: numberAttribute });
  protected readonly versementOpen = signal(false);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.store.load(id));
    });
  }

  protected encaisser(payload: EncaissementPayload): void {
    this.store.encaisser(payload, () => this.versementOpen.set(false));
  }

  protected async annulerVersement(v: Versement): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Annuler ce versement ?',
      message: `Les ${v.lignes.length} ligne(s) de paiement (${new Intl.NumberFormat('fr-FR').format(v.montant)} FCFA) seront supprimées et les dettes recalculées.`,
      confirmLabel: 'Annuler le versement',
      cancelLabel: 'Garder',
    });
    if (ok) this.store.annulerVersement(v);
  }

  protected async supprimer(nom: string, totalDu: number): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Supprimer ${nom} ?`,
      message:
        totalDu > 0
          ? 'Ce client doit encore de l’argent : la suppression sera refusée tant que ses dettes ne sont pas réglées ou annulées.'
          : 'Le client sera retiré de la liste. Cette action est définitive.',
      confirmLabel: 'Supprimer',
    });
    if (ok) this.store.supprimer(() => void this.router.navigateByUrl('/app/clients'));
  }
}
