import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { errorMessage } from '../../../core/data/api-error';
import { telephoneSnValidator } from '../../../core/utils/telephone';
import { IconComponent } from '../../../shared/components/icon.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TelephoneInputDirective } from '../../../shared/directives/telephone-input.directive';
import { AUTH_REPOSITORY, AuthSession, AuthStep, OtpChallenge } from '../domain/auth.repository';
import { AuthLayoutComponent } from './auth-layout.component';
import { OtpStepComponent } from './otp-step.component';
import { PasswordStepComponent } from './password-step.component';

/** whatsapp : propriétaire et gérant. email : administrateur de la plateforme. */
type Mode = 'whatsapp' | 'email';
/** password : première connexion (après le code). admin-password : mot de passe provisoire de l'administrateur. */
type Etape = 'identifiants' | 'otp' | 'password' | 'admin-password';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, TelephoneInputDirective, IconComponent, OtpStepComponent, PasswordStepComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout title="Connexion" [subtitle]="mode() === 'email' ? 'Espace administrateur' : 'Accédez à votre cahier de crédit'">
      <div class="card p-6">
        @if (error()) {
          <div class="mb-4 flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700" role="alert">
            <app-icon name="alert" [size]="18" class="mt-0.5" />
            {{ error() }}
          </div>
        }

        @switch (etape()) {
          @case ('identifiants') {
            <div class="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-ink-100 p-1 text-sm font-medium" role="tablist" aria-label="Type de compte">
              <button
                type="button"
                role="tab"
                class="rounded-md px-3 py-2 transition-colors"
                [class]="mode() === 'whatsapp' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'"
                [attr.aria-selected]="mode() === 'whatsapp'"
                (click)="changerMode('whatsapp')"
              >
                Commerçant
              </button>
              <button
                type="button"
                role="tab"
                class="rounded-md px-3 py-2 transition-colors"
                [class]="mode() === 'email' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'"
                [attr.aria-selected]="mode() === 'email'"
                (click)="changerMode('email')"
              >
                Administrateur
              </button>
            </div>

            <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
              @if (mode() === 'whatsapp') {
                <div>
                  <label class="label" for="telephone">Numéro WhatsApp</label>
                  <input id="telephone" class="input" formControlName="telephone" appTelephoneInput autocomplete="tel" aria-describedby="telephone-err" />
                  @if (form.controls.telephone.touched && form.controls.telephone.invalid) {
                    <p id="telephone-err" class="field-error">Saisissez un numéro sénégalais valide (ex. 77 123 45 67).</p>
                  }
                </div>
              } @else {
                <div>
                  <label class="label" for="email">Adresse e-mail</label>
                  <input id="email" type="email" class="input" formControlName="email" autocomplete="email" aria-describedby="email-err" />
                  @if (form.controls.email.touched && form.controls.email.invalid) {
                    <p id="email-err" class="field-error">Saisissez une adresse e-mail valide.</p>
                  }
                </div>
              }
              <div>
                <div class="flex items-center justify-between">
                  <label class="label" for="password">Mot de passe</label>
                  <a routerLink="/mot-de-passe-oublie" [queryParams]="mode() === 'email' ? { compte: 'admin' } : {}" class="link mb-1.5 text-xs">
                    Mot de passe oublié ?
                  </a>
                </div>
                <input id="password" type="password" class="input" formControlName="password" autocomplete="current-password" aria-describedby="password-err" />
                @if (form.controls.password.touched && form.controls.password.invalid) {
                  <p id="password-err" class="field-error">Le mot de passe est obligatoire.</p>
                }
              </div>
              <button type="submit" class="btn btn-primary w-full" [disabled]="pending()">
                {{ pending() ? 'Connexion…' : 'Se connecter' }}
              </button>
              @if (mode() === 'whatsapp') {
                <p class="text-center text-sm text-ink-600">
                  Pas encore de compte ?
                  <a routerLink="/inscription" class="link">Créer mon compte</a>
                </p>
              }
            </form>
          }
          @case ('otp') {
            <p class="mb-4 text-sm text-ink-700">{{ otpMessage() }}</p>
            <app-otp-step
              [challenge]="challenge()!"
              [pending]="pending()"
              backLabel="Retour"
              (verify)="verifier($event)"
              (resend)="renvoyer()"
              (back)="recommencer()"
            />
          }
          @case ('password') {
            <p class="mb-4 text-sm text-ink-700">Numéro confirmé. Choisissez votre mot de passe personnel.</p>
            <app-password-step submitLabel="Enregistrer et me connecter" [pending]="pending()" (password)="definirMotDePasse($event)" />
          }
          @case ('admin-password') {
            <p class="mb-4 text-sm text-ink-700">Votre mot de passe est provisoire. Choisissez-en un nouveau pour continuer.</p>
            <app-password-step submitLabel="Enregistrer" [pending]="pending()" (password)="remplacerProvisoire($event)" />
          }
        }
      </div>
    </app-auth-layout>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly repo = inject(AUTH_REPOSITORY);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  /** ?retour=/app/clients */
  readonly retour = input<string | undefined>();

  protected readonly mode = signal<Mode>('whatsapp');
  protected readonly etape = signal<Etape>('identifiants');
  protected readonly challenge = signal<OtpChallenge | null>(null);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  private resetToken = '';

  protected readonly form = this.fb.group({
    telephone: ['', [Validators.required, telephoneSnValidator]],
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected otpMessage(): string {
    switch (this.challenge()?.purpose) {
      case 'first_login':
        return 'Première connexion : confirmez votre numéro WhatsApp.';
      case 'signup':
        return 'Terminez votre inscription en confirmant votre numéro WhatsApp.';
      default:
        return 'Votre numéro a changé : confirmez-le pour continuer.';
    }
  }

  protected changerMode(mode: Mode): void {
    this.mode.set(mode);
    this.error.set(null);
    const { telephone, email } = this.form.controls;
    if (mode === 'email') {
      telephone.disable();
      email.enable();
    } else {
      email.disable();
      telephone.enable();
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { telephone, email, password } = this.form.getRawValue();
    this.call(
      this.mode() === 'email' ? this.auth.loginWithEmail(email, password) : this.auth.loginWithPhone(telephone, password),
      (step) => this.suivre(step),
    );
  }

  protected verifier(code: string): void {
    this.call(this.repo.verifyOtp(this.challenge()!.challenge_token, code), (step) => {
      this.auth.openStep(step);
      this.suivre(step);
    });
  }

  protected renvoyer(): void {
    this.call(this.repo.resendOtp(this.challenge()!.challenge_token), (challenge) => {
      this.challenge.set(challenge);
      this.toast.info('Un nouveau code a été envoyé sur WhatsApp.');
    });
  }

  protected definirMotDePasse(password: string): void {
    this.call(this.repo.setPassword(this.resetToken, password), (session) => {
      this.auth.open(session);
      this.toast.success('Mot de passe enregistré. Bienvenue !');
      this.entrer(session);
    });
  }

  protected remplacerProvisoire(password: string): void {
    this.call(this.repo.replaceTemporaryPassword(password), () => {
      this.auth.passwordReplaced();
      this.toast.success('Mot de passe mis à jour.');
      void this.router.navigateByUrl(this.auth.homeUrl());
    });
  }

  protected recommencer(): void {
    this.challenge.set(null);
    this.error.set(null);
    this.form.controls.password.reset();
    this.etape.set('identifiants');
  }

  private suivre(step: AuthStep): void {
    switch (step.step) {
      case 'authenticated':
        this.entrer(step.session);
        break;
      case 'otp_required':
        this.challenge.set(step.challenge);
        this.etape.set('otp');
        break;
      case 'set_password':
        this.resetToken = step.reset_token;
        this.etape.set('password');
        break;
    }
  }

  private entrer(session: AuthSession): void {
    if (session.must_change_password && session.user.role === 'ADMIN') {
      this.etape.set('admin-password');
      return;
    }
    const retour = this.retour();
    void this.router.navigateByUrl(retour?.startsWith('/') ? retour : this.auth.homeUrl());
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
