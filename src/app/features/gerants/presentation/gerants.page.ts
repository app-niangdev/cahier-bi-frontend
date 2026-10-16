import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { User } from '../../../core/domain/user.model';
import { formatTelephone, telephoneSnValidator } from '../../../core/utils/telephone';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { BadgeComponent } from '../../../shared/components/badge.component';
import { ConfirmService } from '../../../shared/components/confirm/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { ModalComponent } from '../../../shared/components/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { QuotaBadgeComponent } from '../../../shared/components/quota-badge.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { TelephoneInputDirective } from '../../../shared/directives/telephone-input.directive';
import { TelephonePipe } from '../../../shared/pipes/telephone.pipe';
import { AccesProvisoire, PlacesBoutique, aDesPlaces } from '../domain/gerant.repository';
import { GerantsStore } from './gerants.store';

type FormMode = { type: 'create'; boutiqueId: number } | { type: 'edit'; gerant: User };

@Component({
  selector: 'app-gerants-page',
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SkeletonComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    ModalComponent,
    QuotaBadgeComponent,
    BadgeComponent,
    AvatarComponent,
    IconComponent,
    TelephoneInputDirective,
    AutofocusDirective,
    TelephonePipe,
  ],
  providers: [GerantsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Gérants" subtitle="Les gérants travaillent dans une seule boutique. Le nombre de places dépend de votre forfait." />

    @if (store.liste.initialLoading() || ctx.loading()) {
      <app-skeleton [rows]="5" />
    } @else if (store.liste.error()) {
      <app-error-state [message]="store.liste.error()" (retry)="store.load()" />
    } @else if (store.parBoutique().length === 0) {
      <div class="card"><app-empty-state icon="store" title="Aucune boutique" message="Vos boutiques sont créées par l'administrateur." /></div>
    } @else {
      <div class="space-y-6">
        @for (bloc of store.parBoutique(); track bloc.boutique.id) {
          <section class="card" [attr.aria-labelledby]="'boutique-' + bloc.boutique.id">
            <header class="flex flex-col gap-3 border-b border-ink-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 [id]="'boutique-' + bloc.boutique.id" class="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                  {{ bloc.boutique.nom }}
                  <app-quota-badge [utilises]="bloc.places.utilises" [max]="bloc.places.max" />
                </h2>
                <p class="text-sm text-ink-500">{{ bloc.boutique.quartier }}, {{ bloc.boutique.ville }}</p>
              </div>
              <div class="sm:text-right">
                <button
                  type="button"
                  class="btn btn-primary"
                  [disabled]="!placeLibre(bloc.places)"
                  [attr.aria-describedby]="placeLibre(bloc.places) ? null : 'quota-' + bloc.boutique.id"
                  (click)="ouvrirCreation(bloc.boutique.id)"
                >
                  <app-icon name="plus" [size]="18" /> Ajouter un gérant
                </button>
                @if (!placeLibre(bloc.places)) {
                  <p [id]="'quota-' + bloc.boutique.id" class="mt-1 max-w-xs text-xs text-warn-700">
                    {{ messageQuota(bloc.places) }}
                  </p>
                }
              </div>
            </header>

            @if (bloc.gerants.length === 0) {
              <app-empty-state icon="user-cog" title="Aucun gérant" message="Ajoutez un gérant pour qu'il note les dettes et encaisse les paiements de cette boutique." />
            } @else {
              <ul class="divide-y divide-ink-100">
                @for (g of bloc.gerants; track g.id) {
                  <li class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
                    <div class="flex min-w-0 flex-1 items-center gap-3" [class.opacity-60]="!g.is_active">
                      <app-avatar [name]="g.name" />
                      <div class="min-w-0">
                        <p class="truncate font-medium text-ink-900">{{ g.name }}</p>
                        <p class="text-sm text-ink-500">{{ g.telephone | telephone }}</p>
                      </div>
                      <app-badge [tone]="g.is_active ? 'ok' : 'neutral'">{{ g.is_active ? 'Actif' : 'Désactivé' }}</app-badge>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <button type="button" class="btn btn-secondary btn-sm" (click)="ouvrirEdition(g)" [attr.aria-label]="'Modifier ' + g.name">
                        <app-icon name="edit" [size]="14" /> Modifier
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm" [disabled]="store.action.pending()" (click)="basculer(g)">
                        <app-icon name="power" [size]="14" /> {{ g.is_active ? 'Désactiver' : 'Activer' }}
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm" [disabled]="store.action.pending()" (click)="reinitialiser(g)">
                        <app-icon name="key" [size]="14" /> Réinitialiser l'accès
                      </button>
                      @if (store.parBoutique().length > 1) {
                        <button type="button" class="btn btn-secondary btn-sm" (click)="ouvrirTransfert(g)">
                          <app-icon name="transfer" [size]="14" /> Transférer
                        </button>
                      }
                      <button type="button" class="btn btn-secondary btn-sm text-danger-700" [disabled]="store.action.pending()" (click)="supprimer(g)">
                        <app-icon name="trash" [size]="14" /> Supprimer
                      </button>
                    </div>
                  </li>
                }
              </ul>
            }
          </section>
        }
      </div>
    }

    <!-- Ajout / modification -->
    <app-modal [open]="formMode() !== null" [title]="formMode()?.type === 'edit' ? 'Modifier le gérant' : 'Ajouter un gérant'" [subtitle]="formSubtitle()" (closed)="formMode.set(null)">
      <form class="space-y-4" [formGroup]="form" (ngSubmit)="enregistrer()" novalidate>
        <div>
          <label class="label" for="g-name">Nom complet</label>
          <input id="g-name" class="input" formControlName="name" appAutofocus aria-describedby="g-name-err" />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <p id="g-name-err" class="field-error">Le nom est obligatoire.</p>
          }
        </div>
        <div>
          <label class="label" for="g-tel">Numéro WhatsApp</label>
          <input id="g-tel" class="input" formControlName="telephone" appTelephoneInput aria-describedby="g-tel-help g-tel-err" />
          <p id="g-tel-help" class="mt-1 text-xs text-ink-500">Le gérant se connecte avec ce numéro.</p>
          @if (form.controls.telephone.touched && form.controls.telephone.invalid) {
            <p id="g-tel-err" class="field-error">Numéro sénégalais invalide.</p>
          }
        </div>
        <div class="flex justify-end gap-2 border-t border-ink-100 pt-4">
          <button type="button" class="btn btn-secondary" (click)="formMode.set(null)">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="store.action.pending()">{{ store.action.pending() ? 'Enregistrement…' : 'Enregistrer' }}</button>
        </div>
      </form>
    </app-modal>

    <!-- Transfert -->
    <app-modal [open]="transfert() !== null" title="Transférer le gérant" [subtitle]="transfert()?.gerant?.name ?? null" (closed)="transfert.set(null)">
      @if (transfert(); as t) {
        <form class="space-y-4" (ngSubmit)="transferer()">
          <fieldset>
            <legend class="label">Nouvelle boutique</legend>
            <div class="space-y-2">
              @for (bloc of store.parBoutique(); track bloc.boutique.id) {
                @if (bloc.boutique.id !== t.gerant.boutique_id) {
                  <label
                    class="flex items-center gap-3 rounded-lg border p-3 text-sm"
                    [class]="placeLibre(bloc.places) ? 'cursor-pointer has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50' : 'cursor-not-allowed bg-ink-50 text-ink-500'"
                  >
                    <input
                      type="radio"
                      name="cible"
                      class="accent-brand-600"
                      [value]="bloc.boutique.id"
                      [checked]="cible() === bloc.boutique.id"
                      [disabled]="!placeLibre(bloc.places)"
                      (change)="cible.set(bloc.boutique.id)"
                    />
                    <span class="flex-1">
                      <span class="block font-medium">{{ bloc.boutique.nom }}</span>
                      @if (!placeLibre(bloc.places)) {
                        <span class="block text-xs text-warn-700">Limite atteinte : transfert impossible.</span>
                      }
                    </span>
                    <app-quota-badge [utilises]="bloc.places.utilises" [max]="bloc.places.max" />
                  </label>
                }
              }
            </div>
          </fieldset>
          <div class="flex justify-end gap-2 border-t border-ink-100 pt-4">
            <button type="button" class="btn btn-secondary" (click)="transfert.set(null)">Annuler</button>
            <button type="submit" class="btn btn-primary" [disabled]="cible() === null || store.action.pending()">Transférer</button>
          </div>
        </form>
      }
    </app-modal>

    <!-- Mot de passe provisoire -->
    <app-modal [open]="acces() !== null" title="Accès du gérant" (closed)="acces.set(null)">
      @if (acces(); as a) {
        <p class="text-sm text-ink-700">Communiquez ce mot de passe provisoire à <strong>{{ a.gerant.name }}</strong>. À sa première connexion, il recevra un code WhatsApp puis choisira son propre mot de passe.</p>
        <dl class="mt-4 space-y-2 rounded-lg bg-ink-50 p-4 text-sm">
          <div class="flex justify-between"><dt class="text-ink-500">Téléphone</dt><dd class="font-medium">{{ a.gerant.telephone | telephone }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-500">Mot de passe provisoire</dt><dd class="font-mono text-base font-bold">{{ a.mot_de_passe_provisoire }}</dd></div>
        </dl>
        <div class="mt-4 flex justify-end"><button type="button" class="btn btn-primary" (click)="acces.set(null)">J'ai noté</button></div>
      }
    </app-modal>
  `,
})
export class GerantsPage {
  protected readonly store = inject(GerantsStore);
  protected readonly ctx = inject(BoutiqueContextStore);
  private readonly confirm = inject(ConfirmService);

  protected readonly formMode = signal<FormMode | null>(null);
  protected readonly transfert = signal<{ gerant: User } | null>(null);
  protected readonly cible = signal<number | null>(null);
  protected readonly acces = signal<AccesProvisoire | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', Validators.required],
    telephone: ['', [Validators.required, telephoneSnValidator]],
  });

  protected readonly formSubtitle = computed(() => {
    const mode = this.formMode();
    if (mode?.type !== 'create') return null;
    return this.ctx.boutiques().find((b) => b.id === mode.boutiqueId)?.nom ?? null;
  });

  protected placeLibre(places: PlacesBoutique): boolean {
    return aDesPlaces(places);
  }

  protected messageQuota(places: PlacesBoutique): string {
    return places.max === 0
      ? "Votre abonnement ne permet pas d'ajouter de gérant. Renouvelez-le ou changez de forfait."
      : `Limite de ${places.max} gérant${(places.max ?? 0) > 1 ? 's' : ''} atteinte pour cette boutique. Passez à un forfait supérieur pour en ajouter.`;
  }

  protected ouvrirCreation(boutiqueId: number): void {
    this.form.reset({ name: '', telephone: '' });
    this.formMode.set({ type: 'create', boutiqueId });
  }

  protected ouvrirEdition(gerant: User): void {
    this.form.reset({ name: gerant.name, telephone: formatTelephone(gerant.telephone) });
    this.formMode.set({ type: 'edit', gerant });
  }

  protected enregistrer(): void {
    const mode = this.formMode();
    if (!mode) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.getRawValue();
    if (mode.type === 'create') {
      this.store.run(this.store.repo.create({ ...payload, boutique_id: mode.boutiqueId }), {
        success: (r) => `${r.gerant.name} a été ajouté.`,
        onSuccess: (r) => {
          this.formMode.set(null);
          this.acces.set(r);
        },
      });
    } else {
      this.store.run(this.store.repo.update(mode.gerant.id, payload), {
        success: 'Gérant modifié.',
        onSuccess: () => this.formMode.set(null),
      });
    }
  }

  protected async basculer(g: User): Promise<void> {
    if (g.is_active) {
      const ok = await this.confirm.ask({
        title: `Désactiver ${g.name} ?`,
        message: 'Il ne pourra plus se connecter. Sa place reste occupée dans la boutique.',
        confirmLabel: 'Désactiver',
      });
      if (!ok) return;
    }
    this.store.run(this.store.repo.toggleStatus(g.id), { success: (u) => `${u.name} est ${u.is_active ? 'activé' : 'désactivé'}.` });
  }

  protected async reinitialiser(g: User): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Réinitialiser l'accès de ${g.name} ?`,
      message: 'Un nouveau mot de passe provisoire sera créé ; l’ancien ne fonctionnera plus.',
      confirmLabel: 'Réinitialiser',
      danger: false,
    });
    if (ok) this.store.run(this.store.repo.resetAccess(g.id), { onSuccess: (r) => this.acces.set(r) });
  }

  protected ouvrirTransfert(gerant: User): void {
    const premiere = this.store.parBoutique().find((b) => b.boutique.id !== gerant.boutique_id && aDesPlaces(b.places));
    this.cible.set(premiere?.boutique.id ?? null);
    this.transfert.set({ gerant });
  }

  protected transferer(): void {
    const t = this.transfert();
    const cible = this.cible();
    if (!t || cible === null) return;
    this.store.run(this.store.repo.transfer(t.gerant.id, cible), {
      success: (u) => `${u.name} travaille désormais à ${this.ctx.boutiques().find((b) => b.id === u.boutique_id)?.nom}.`,
      onSuccess: () => this.transfert.set(null),
    });
  }

  protected async supprimer(g: User): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Supprimer ${g.name} ?`,
      message: 'Son compte sera supprimé et sa place libérée. Les dettes et paiements qu’il a enregistrés sont conservés.',
      confirmLabel: 'Supprimer',
    });
    if (ok) this.store.run(this.store.repo.delete(g.id), { success: 'Gérant supprimé.' });
  }
}
