import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '../../../core/auth/auth.store';
import { ROLE_LABELS } from '../../../core/domain/enums';
import { formatTelephone, telephoneSnValidator } from '../../../core/utils/telephone';
import { AvatarComponent } from '../../../shared/components/avatar.component';
import { BadgeComponent } from '../../../shared/components/badge.component';
import { PageHeaderComponent } from '../../../shared/components/page-header.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TelephoneInputDirective } from '../../../shared/directives/telephone-input.directive';
import { ActionRunner } from '../../../shared/utils/action-runner';
import { PASSWORD_MIN_LENGTH, passwordsMatch } from '../../../shared/utils/validators';
import { AUTH_REPOSITORY } from '../../auth/domain/auth.repository';

/** Profil : coordonnées secondaires et mot de passe (PUT /auth/me). Nom et identifiant sont gérés par l'administrateur. */
@Component({
  selector: 'app-profil-page',
  imports: [ReactiveFormsModule, PageHeaderComponent, AvatarComponent, BadgeComponent, TelephoneInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Mon profil" />

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="card p-5" aria-labelledby="infos-title">
        <div class="mb-5 flex items-center gap-4">
          <app-avatar [name]="auth.user()?.name ?? ''" [size]="52" />
          <div>
            <h2 id="infos-title" class="font-semibold text-ink-900">Mes informations</h2>
            <app-badge tone="brand">{{ roleLabel() }}</app-badge>
          </div>
        </div>
        <dl class="mb-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-ink-500">Nom complet</dt>
            <dd class="font-medium text-ink-900">{{ auth.user()?.name }}</dd>
          </div>
          <div>
            @if (auth.isAdmin()) {
              <dt class="text-ink-500">E-mail (identifiant de connexion)</dt>
              <dd class="font-medium text-ink-900">{{ auth.user()?.email }}</dd>
            } @else {
              <dt class="text-ink-500">Numéro WhatsApp (identifiant de connexion)</dt>
              <dd class="font-medium text-ink-900">{{ telephone() }}</dd>
            }
          </div>
        </dl>
        <form class="space-y-4" [formGroup]="infos" (ngSubmit)="enregistrerInfos()" novalidate>
          <div>
            <label class="label" for="p-tel2">Téléphone secondaire</label>
            <input id="p-tel2" class="input" formControlName="phone_two" appTelephoneInput aria-describedby="p-tel2-err" />
            @if (infos.controls.phone_two.touched && infos.controls.phone_two.invalid) {
              <p id="p-tel2-err" class="field-error">Numéro sénégalais invalide.</p>
            }
          </div>
          <div>
            <label class="label" for="p-address">Adresse</label>
            <input id="p-address" class="input" formControlName="address" autocomplete="street-address" maxlength="255" />
          </div>
          <div class="flex justify-end">
            <button type="submit" class="btn btn-primary" [disabled]="infosAction.pending() || infos.pristine">
              {{ infosAction.pending() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </section>

      <section class="card p-5" aria-labelledby="mdp-title">
        <h2 id="mdp-title" class="mb-4 font-semibold text-ink-900">Changer mon mot de passe</h2>
        <form class="space-y-4" [formGroup]="motDePasse" (ngSubmit)="changerMotDePasse()" novalidate>
          <div>
            <label class="label" for="p-current">Mot de passe actuel</label>
            <input id="p-current" type="password" class="input" formControlName="current" autocomplete="current-password" />
            @if (motDePasse.controls.current.touched && motDePasse.controls.current.invalid) {
              <p class="field-error">Saisissez votre mot de passe actuel.</p>
            }
          </div>
          <div>
            <label class="label" for="p-new">Nouveau mot de passe</label>
            <input id="p-new" type="password" class="input" formControlName="password" autocomplete="new-password" />
            @if (motDePasse.controls.password.touched && motDePasse.controls.password.invalid) {
              <p class="field-error">Au moins {{ minLength }} caractères.</p>
            }
          </div>
          <div>
            <label class="label" for="p-confirm">Confirmer le nouveau mot de passe</label>
            <input id="p-confirm" type="password" class="input" formControlName="confirmation" autocomplete="new-password" />
            @if (motDePasse.controls.confirmation.touched && motDePasse.hasError('passwordsMismatch')) {
              <p class="field-error">Les deux mots de passe ne correspondent pas.</p>
            }
          </div>
          <div class="flex justify-end">
            <button type="submit" class="btn btn-primary" [disabled]="mdpAction.pending()">
              {{ mdpAction.pending() ? 'Modification…' : 'Changer le mot de passe' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
})
export class ProfilPage {
  protected readonly auth = inject(AuthStore);
  private readonly repo = inject(AUTH_REPOSITORY);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(ToastService);
  protected readonly infosAction = new ActionRunner(this.toast);
  protected readonly mdpAction = new ActionRunner(this.toast);
  protected readonly minLength = PASSWORD_MIN_LENGTH;

  protected roleLabel(): string {
    const role = this.auth.role();
    return role ? ROLE_LABELS[role] : '';
  }

  protected readonly telephone = computed(() => formatTelephone(this.auth.user()?.telephone));

  protected readonly infos = this.fb.group({
    phone_two: ['', telephoneSnValidator],
    address: [''],
  });

  protected readonly motDePasse = this.fb.group(
    {
      current: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user) untracked(() => this.infos.reset({ phone_two: formatTelephone(user.phone_two), address: user.address ?? '' }));
    });
  }

  protected enregistrerInfos(): void {
    if (this.infos.invalid) {
      this.infos.markAllAsTouched();
      return;
    }
    this.infosAction.run(this.repo.updateMe(this.infos.getRawValue()), {
      success: 'Profil mis à jour.',
      onSuccess: (user) => this.auth.updateUser(user),
    });
  }

  protected changerMotDePasse(): void {
    if (this.motDePasse.invalid) {
      this.motDePasse.markAllAsTouched();
      return;
    }
    const v = this.motDePasse.getRawValue();
    this.mdpAction.run(this.repo.changePassword(v.current, v.password), {
      success: 'Mot de passe modifié.',
      onSuccess: (user) => {
        this.auth.updateUser(user);
        this.motDePasse.reset();
      },
    });
  }
}
