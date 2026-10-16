import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { errorMessage } from '../../../core/data/api-error';
import { telephoneSnValidator } from '../../../core/utils/telephone';
import { IconComponent } from '../../../shared/components/icon.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TelephoneInputDirective } from '../../../shared/directives/telephone-input.directive';
import { PASSWORD_MIN_LENGTH, passwordsMatch } from '../../../shared/utils/validators';
import { AUTH_REPOSITORY, OtpChallenge } from '../domain/auth.repository';
import { AuthLayoutComponent } from './auth-layout.component';
import { OtpStepComponent } from './otp-step.component';

type Etape = 'infos' | 'otp';

/** Inscription du propriétaire : informations et mot de passe → code WhatsApp (active le compte et connecte). */
@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, OtpStepComponent, TelephoneInputDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout title="Créer mon compte" subtitle="14 jours d'essai gratuit, sans engagement">
      <ol class="mb-4 flex items-center justify-center gap-2 text-xs font-medium" aria-label="Étapes de l'inscription">
        @for (step of steps; track step.id; let i = $index) {
          <li class="flex items-center gap-2" [attr.aria-current]="etape() === step.id ? 'step' : null">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full"
              [class]="indexOf(etape()) >= i ? 'bg-brand-600 text-white' : 'bg-ink-200 text-ink-600'"
              >{{ i + 1 }}</span
            >
            <span [class]="etape() === step.id ? 'text-ink-900' : 'text-ink-500'">{{ step.label }}</span>
            @if (i < steps.length - 1) {
              <span class="h-px w-4 bg-ink-300" aria-hidden="true"></span>
            }
          </li>
        }
      </ol>

      <div class="card p-6">
        @if (error()) {
          <div class="mb-4 flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700" role="alert">
            <app-icon name="alert" [size]="18" class="mt-0.5" /> {{ error() }}
          </div>
        }

        @switch (etape()) {
          @case ('infos') {
            <form class="space-y-4" [formGroup]="form" (ngSubmit)="envoyerCode()" novalidate>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="label" for="first_name">Prénom</label>
                  <input id="first_name" class="input" formControlName="first_name" autocomplete="given-name" aria-describedby="first_name-err" />
                  @if (form.controls.first_name.touched && form.controls.first_name.invalid) {
                    <p id="first_name-err" class="field-error">Au moins 2 caractères.</p>
                  }
                </div>
                <div>
                  <label class="label" for="last_name">Nom</label>
                  <input id="last_name" class="input" formControlName="last_name" autocomplete="family-name" aria-describedby="last_name-err" />
                  @if (form.controls.last_name.touched && form.controls.last_name.invalid) {
                    <p id="last_name-err" class="field-error">Au moins 2 caractères.</p>
                  }
                </div>
              </div>
              <div>
                <label class="label" for="entreprise">Nom de votre commerce</label>
                <input id="entreprise" class="input" formControlName="company_name" placeholder="Ex. Alimentation Fall" aria-describedby="entreprise-err" />
                @if (form.controls.company_name.touched && form.controls.company_name.invalid) {
                  <p id="entreprise-err" class="field-error">Le nom du commerce est obligatoire.</p>
                }
              </div>
              <div>
                <label class="label" for="reg-telephone">Numéro WhatsApp</label>
                <input id="reg-telephone" class="input" formControlName="telephone" appTelephoneInput aria-describedby="reg-telephone-help reg-telephone-err" />
                <p id="reg-telephone-help" class="mt-1 text-xs text-ink-500">Vous recevrez un code de confirmation sur WhatsApp.</p>
                @if (form.controls.telephone.touched && form.controls.telephone.invalid) {
                  <p id="reg-telephone-err" class="field-error">Saisissez un numéro sénégalais valide.</p>
                }
              </div>
              <div>
                <label class="label" for="reg-password">Mot de passe</label>
                <input id="reg-password" type="password" class="input" formControlName="password" autocomplete="new-password" aria-describedby="reg-password-err" />
                @if (form.controls.password.touched && form.controls.password.invalid) {
                  <p id="reg-password-err" class="field-error">Au moins {{ minLength }} caractères.</p>
                }
              </div>
              <div>
                <label class="label" for="reg-confirmation">Confirmer le mot de passe</label>
                <input id="reg-confirmation" type="password" class="input" formControlName="confirmation" autocomplete="new-password" aria-describedby="reg-confirmation-err" />
                @if (form.controls.confirmation.touched && form.hasError('passwordsMismatch')) {
                  <p id="reg-confirmation-err" class="field-error">Les deux mots de passe ne correspondent pas.</p>
                }
              </div>
              <button type="submit" class="btn btn-primary w-full" [disabled]="pending()">{{ pending() ? 'Envoi…' : 'Recevoir le code' }}</button>
              <p class="text-center text-sm text-ink-600">Déjà inscrit ? <a routerLink="/connexion" class="link">Se connecter</a></p>
            </form>
          }
          @case ('otp') {
            <app-otp-step
              [challenge]="challenge()!"
              [pending]="pending()"
              (verify)="verifier($event)"
              (resend)="renvoyer()"
              (back)="etape.set('infos')"
            />
          }
        }
      </div>
    </app-auth-layout>
  `,
})
export class RegisterPage {
  private readonly repo = inject(AUTH_REPOSITORY);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly steps: { id: Etape; label: string }[] = [
    { id: 'infos', label: 'Informations' },
    { id: 'otp', label: 'Code WhatsApp' },
  ];
  protected readonly etape = signal<Etape>('infos');
  protected readonly challenge = signal<OtpChallenge | null>(null);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly minLength = PASSWORD_MIN_LENGTH;

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      company_name: ['', [Validators.required, Validators.minLength(2)]],
      telephone: ['', [Validators.required, telephoneSnValidator]],
      password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected indexOf(etape: Etape): number {
    return this.steps.findIndex((s) => s.id === etape);
  }

  protected envoyerCode(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { first_name, last_name, company_name, telephone, password } = this.form.getRawValue();
    this.call(this.repo.register({ first_name, last_name, company_name, telephone, password }), (challenge) => {
      this.challenge.set(challenge);
      this.toast.info('Code envoyé sur WhatsApp.');
      this.etape.set('otp');
    });
  }

  protected renvoyer(): void {
    this.call(this.repo.resendOtp(this.challenge()!.challenge_token), (challenge) => {
      this.challenge.set(challenge);
      this.toast.info('Un nouveau code a été envoyé.');
    });
  }

  /** Code valide : le compte est activé avec sa période d'essai et la session s'ouvre. */
  protected verifier(code: string): void {
    this.call(this.repo.verifyOtp(this.challenge()!.challenge_token, code), (step) => {
      this.auth.openStep(step);
      this.toast.success("Bienvenue ! Votre période d'essai commence aujourd'hui.");
      void this.router.navigateByUrl(this.auth.homeUrl());
    });
  }

  private call<T>(source: Observable<T>, onSuccess: (value: T) => void): void {
    this.pending.set(true);
    this.error.set(null);
    source.subscribe({
      next: (value) => {
        this.pending.set(false);
        onSuccess(value);
      },
      error: (e) => {
        this.pending.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}
