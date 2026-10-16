import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { NoBoutiqueComponent } from '../../../core/boutique/no-boutique.component';
import { formatTelephone, telephoneSnValidator } from '../../../core/utils/telephone';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { TelephoneInputDirective } from '../../../shared/directives/telephone-input.directive';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { Loadable } from '../../../shared/utils/loadable';
import { Client, ClientPayload } from '../domain/client.model';
import { CLIENT_REPOSITORY } from '../domain/client.repository';

/** Création (/clients/nouveau) et modification (/clients/:id/modifier). */
@Component({
  selector: 'app-client-form-page',
  imports: [ReactiveFormsModule, PageHeaderComponent, SkeletonComponent, ErrorStateComponent, NoBoutiqueComponent, TelephoneInputDirective, AutofocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="isEdit() ? 'Modifier le client' : 'Nouveau client'" [backLink]="retour()" backLabel="Retour" />

    @if (!ctx.current()) {
      <app-no-boutique />
    } @else if (existing.initialLoading()) {
      <app-skeleton variant="detail" [rows]="3" />
    } @else if (existing.error()) {
      <app-error-state [message]="existing.error()" (retry)="existing.reload()" />
    } @else {
      <form class="card max-w-2xl space-y-4 p-6" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div>
          <label class="label" for="nom">Nom complet <span class="text-danger-700" aria-hidden="true">*</span></label>
          <input id="nom" class="input" formControlName="nom" placeholder="Ex. Moussa Ndiaye" appAutofocus required aria-describedby="nom-err" />
          @if (form.controls.nom.touched && form.controls.nom.invalid) {
            <p id="nom-err" class="field-error">Le nom est obligatoire (2 caractères minimum).</p>
          }
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="label" for="telephone">Téléphone</label>
            <input id="telephone" class="input" formControlName="telephone" appTelephoneInput aria-describedby="telephone-err" />
            @if (form.controls.telephone.touched && form.controls.telephone.invalid) {
              <p id="telephone-err" class="field-error">Numéro sénégalais invalide (+221 7X XXX XX XX).</p>
            }
          </div>
          <div>
            <label class="label" for="whatsapp">WhatsApp</label>
            <input id="whatsapp" class="input" formControlName="whatsapp" appTelephoneInput aria-describedby="whatsapp-err" />
            @if (form.controls.whatsapp.touched && form.controls.whatsapp.invalid) {
              <p id="whatsapp-err" class="field-error">Numéro sénégalais invalide.</p>
            }
            <button type="button" class="link mt-1 text-xs" (click)="copierTelephone()">Identique au téléphone</button>
          </div>
        </div>
        <div>
          <label class="label" for="adresse">Adresse</label>
          <input id="adresse" class="input" formControlName="adresse" placeholder="Quartier, rue…" />
        </div>
        <div>
          <label class="label" for="note">Note</label>
          <textarea id="note" class="input" rows="3" formControlName="note" placeholder="Informations utiles (habitudes de paiement…)"></textarea>
        </div>
        <div class="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" class="btn btn-secondary" (click)="annuler()">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="action.pending()">
            {{ action.pending() ? 'Enregistrement…' : isEdit() ? 'Enregistrer les modifications' : 'Créer le client' }}
          </button>
        </div>
      </form>
    }
  `,
})
export class ClientFormPage {
  private readonly repo = inject(CLIENT_REPOSITORY);
  private readonly router = inject(Router);
  protected readonly ctx = inject(BoutiqueContextStore);
  protected readonly action = new ActionRunner(inject(ToastService));

  /** Paramètre de route (absent en création) */
  readonly id = input<string | undefined>();
  protected readonly clientId = computed(() => (this.id() ? Number(this.id()) : null));
  protected readonly isEdit = computed(() => this.clientId() !== null);
  protected readonly retour = computed(() => (this.clientId() ? `/app/clients/${this.clientId()}` : '/app/clients'));
  protected readonly existing = new Loadable<Client>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    telephone: ['', telephoneSnValidator],
    whatsapp: ['', telephoneSnValidator],
    adresse: [''],
    note: [''],
  });

  constructor() {
    effect(() => {
      const id = this.clientId();
      untracked(() => {
        if (!id) return;
        this.existing.load(() => this.repo.get(id));
      });
    });
    effect(() => {
      const c = this.existing.data();
      if (!c) return;
      this.form.setValue({
        nom: c.nom,
        telephone: formatTelephone(c.telephone),
        whatsapp: formatTelephone(c.whatsapp),
        adresse: c.adresse ?? '',
        note: c.note ?? '',
      });
    });
  }

  protected copierTelephone(): void {
    this.form.controls.whatsapp.setValue(this.form.controls.telephone.value);
  }

  protected annuler(): void {
    void this.router.navigateByUrl(this.retour());
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: ClientPayload = {
      nom: v.nom,
      telephone: v.telephone || null,
      whatsapp: v.whatsapp || null,
      adresse: v.adresse || null,
      note: v.note || null,
    };
    const id = this.clientId();
    const boutiqueId = this.ctx.currentId();
    if (!id && !boutiqueId) return;
    this.action.run(id ? this.repo.update(id, payload) : this.repo.create(boutiqueId as number, payload), {
      success: id ? 'Client modifié.' : 'Client créé.',
      onSuccess: (client) => void this.router.navigate(['/app/clients', client.id]),
    });
  }
}
