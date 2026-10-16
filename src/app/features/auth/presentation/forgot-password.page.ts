import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { errorMessage } from '../../../core/data/api-error';
import { telephoneSnValidator } from '../../../core/utils/telephone';
import { IconComponent } from '../../../shared/components/icon.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TelephoneInputDirective } from '../../../shared/directives/telephone-input.directive';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { PASSWORD_MIN_LENGTH, passwordsMatch } from '../../../shared/utils/validators';
import { AUTH_REPOSITORY, OtpChallenge } from '../domain/auth.repository';
import { AuthLayoutComponent } from './auth-layout.component';
import { OtpStepComponent } from './otp-step.component';
import { PasswordStepComponent } from './password-step.component';

/** Commerçant : téléphone → code WhatsApp → mot de passe. Administrateur : e-mail → code e-mail + mot de passe. */
type Etape = 'identifiant' | 'otp' | 'password' | 'email-code';

@Component({
  selector: 'app-forgot-password-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthLayoutComponent,
    OtpStepComponent,
    PasswordStepComponent,
    TelephoneInputDirective,
    AutofocusDirective,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout
      title="Mot de passe oublié"
      [subtitle]="admin() ? 'Recevez un code par e-mail pour le réinitialiser' : 'Recevez un code sur WhatsApp pour le réinitialiser'"
    >
      <div class="card p-6">
        @if (error()) {
          <div class="mb-4 flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700" role="alert">
            <app-icon name="alert" [size]="18" class="mt-0.5" /> {{ error() }}
          </div>
        }
        @switch (etape()) {
          @case ('identifiant') {
            @if (admin()) {
              <form class="space-y-4" [formGroup]="emailForm" (ngSubmit)="envoyerEmail()" novalidate>
                <div>
                  <label class="label" for="fp-email">Adresse e-mail de l'administrateur</label>
                  <input id="fp-email" type="email" class="input" formControlName="email" autocomplete="email" aria-describedby="fp-email-err" />
                  @if (emailForm.controls.email.touched && emailForm.controls.email.invalid) {
                    <p id="fp-email-err" class="field-error">Saisissez une adresse e-mail valide.</p>
                  }
                </div>
                <button type="submit" class="btn btn-primary w-full" [disabled]="pending()">{{ pending() ? 'Envoi…' : 'Recevoir le code' }}</button>
              </form>
            } @else {
              <form class="space-y-4" [formGroup]="form" (ngSubmit)="envoyer()" novalidate>
                <div>
                  <label class="label" for="fp-telephone">Numéro WhatsApp du compte</label>
                  <input id="fp-telephone" class="input" formControlName="telephone" appTelephoneInput aria-describedby="fp-telephone-err" />
                  @if (form.controls.telephone.touched && form.controls.telephone.invalid) {
                    <p id="fp-telephone-err" class="field-error">Saisissez un numéro sénégalais valide.</p>
                  }
                </div>
                <button type="submit" class="btn btn-primary w-full" [disabled]="pending()">{{ pending() ? 'Envoi…' : 'Recevoir le code' }}</button>
              </form>
            }
          }
          @case ('otp') {
            <app-otp-step
              [challenge]="challenge()!"
              [pending]="pending()"
              (verify)="verifier($event)"
              (resend)="renvoyer()"
              (back)="etape.set('identifiant')"
            />
          }
          @case ('password') {
            <app-password-step submitLabel="Réinitialiser le mot de passe" [pending]="pending()" (password)="reinitialiser($event)" />
          }
          @case ('email-code') {
            <form class="space-y-4" [formGroup]="resetForm" (ngSubmit)="reinitialiserAdmin()" novalidate>
              <p class="text-sm text-ink-700">
                Si l'adresse <strong>{{ emailForm.controls.email.value }}</strong> correspond à un administrateur, un code de vérification
                vient d'y être envoyé (valable 15 min).
              </p>
              <div>
                <label class="label" for="fp-code">Code reçu par e-mail</label>
                <input id="fp-code" class="input text-center font-mono text-2xl tracking-[0.5em]" formControlName="code" inputmode="numeric" maxlength="6" appAutofocus aria-describedby="fp-code-err" />
                @if (resetForm.controls.code.touched && resetForm.controls.code.invalid) {
                  <p id="fp-code-err" class="field-error">Le code contient 6 chiffres.</p>
                }
              </div>
              <div>
                <label class="label" for="fp-password">Nouveau mot de passe</label>
                <input id="fp-password" type="password" class="input" formControlName="password" autocomplete="new-password" aria-describedby="fp-password-err" />
                @if (resetForm.controls.password.touched && resetForm.controls.password.invalid) {
                  <p id="fp-password-err" class="field-error">Au moins {{ minLength }} caractères.</p>
                }
              </div>
              <div>
                <label class="label" for="fp-confirmation">Confirmer le mot de passe</label>
                <input id="fp-confirmation" type="password" class="input" formControlName="confirmation" autocomplete="new-password" aria-describedby="fp-confirmation-err" />
                @if (resetForm.controls.confirmation.touched && resetForm.hasError('passwordsMismatch')) {
                  <p id="fp-confirmation-err" class="field-error">Les deux mots de passe ne correspondent pas.</p>
                }
              </div>
              <button type="submit" class="btn btn-primary w-full" [disabled]="pending()">
                {{ pending() ? 'Enregistrement…' : 'Réinitialiser le mot de passe' }}
              </button>
              <button type="button" class="link w-full text-center text-sm" (click)="etape.set('identifiant')">Changer d'adresse</button>
            </form>
          }
        }
        <p class="mt-4 text-center text-sm"><a routerLink="/connexion" class="link">Retour à la connexion</a></p>
      </div>
    </app-auth-layout>
  `,
})
export class ForgotPasswordPage {
  private readonly repo = inject(AUTH_REPOSITORY);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  /** ?compte=admin : réinitialisation par e-mail. */
  readonly compte = input<string | undefined>();
  protected readonly admin = computed(() => this.compte() === 'admin');

  protected readonly etape = signal<Etape>('identifiant');
  protected readonly challenge = signal<OtpChallenge | null>(null);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly minLength = PASSWORD_MIN_LENGTH;
  private resetToken = '';

  protected readonly form = this.fb.group({
    telephone: ['', [Validators.required, telephoneSnValidator]],
  });

  protected readonly emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly resetForm = this.fb.group(
    {
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected envoyer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.call(this.repo.forgotPassword(this.form.getRawValue().telephone), (challenge) => {
      this.challenge.set(challenge);
      this.toast.info('Un code a été envoyé sur WhatsApp.');
      this.etape.set('otp');
    });
  }

  protected renvoyer(): void {
    this.call(this.repo.resendOtp(this.challenge()!.challenge_token), (challenge) => {
      this.challenge.set(challenge);
      this.toast.info('Un nouveau code a été envoyé.');
    });
  }

  protected verifier(code: string): void {
    this.call(this.repo.verifyOtp(this.challenge()!.challenge_token, code), (step) => {
      if (step.step === 'set_password') {
        this.resetToken = step.reset_token;
        this.etape.set('password');
      }
    });
  }

  /** Nouveau mot de passe : la session s'ouvre directement. */
  protected reinitialiser(password: string): void {
    this.call(this.repo.setPassword(this.resetToken, password), (session) => {
      this.auth.open(session);
      this.toast.success('Mot de passe réinitialisé.');
      void this.router.navigateByUrl(this.auth.homeUrl());
    });
  }

  protected envoyerEmail(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.call(this.repo.forgotPasswordByEmail(this.emailForm.getRawValue().email), () => {
      this.resetForm.reset();
      this.etape.set('email-code');
    });
  }

  protected reinitialiserAdmin(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }
    const { code, password } = this.resetForm.getRawValue();
    this.call(this.repo.resetPasswordByEmail(this.emailForm.getRawValue().email, code, password), () => {
      this.toast.success('Mot de passe modifié. Vous pouvez vous connecter.');
      void this.router.navigateByUrl('/connexion');
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
