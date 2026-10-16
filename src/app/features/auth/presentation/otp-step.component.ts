import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { OtpChallenge } from '../domain/auth.repository';

/** Saisie du code à 6 chiffres reçu sur WhatsApp. */
@Component({
  selector: 'app-otp-step',
  imports: [ReactiveFormsModule, AutofocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <p class="text-sm text-ink-700">
        Un code à 6 chiffres a été envoyé sur WhatsApp
        @if (challenge().phone_masked) {
          au <strong class="font-mono">{{ challenge().phone_masked }}</strong>
        }.
      </p>
      <div>
        <label class="label" for="otp">Code de vérification</label>
        <input
          id="otp"
          class="input text-center font-mono text-2xl tracking-[0.5em]"
          formControlName="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          appAutofocus
          aria-describedby="otp-err"
        />
        @if (form.controls.code.touched && form.controls.code.invalid) {
          <p id="otp-err" class="field-error">Le code contient 6 chiffres.</p>
        }
      </div>
      <button type="submit" class="btn btn-primary w-full" [disabled]="pending()">{{ pending() ? 'Vérification…' : 'Vérifier le code' }}</button>
      <div class="flex justify-between text-sm">
        <button type="button" class="link" (click)="back.emit()">{{ backLabel() }}</button>
        @if (challenge().resends_left > 0) {
          <button type="button" class="link disabled:no-underline disabled:opacity-60" [disabled]="pending() || wait() > 0" (click)="resend.emit()">
            {{ wait() > 0 ? 'Renvoyer le code (' + wait() + ' s)' : 'Renvoyer le code' }}
          </button>
        }
      </div>
    </form>
  `,
})
export class OtpStepComponent {
  readonly challenge = input.required<OtpChallenge>();
  readonly pending = input(false);
  readonly backLabel = input('Modifier le numéro');
  readonly verify = output<string>();
  readonly resend = output<void>();
  readonly back = output<void>();

  /** Secondes avant de pouvoir redemander un code (resend_in de l'API). */
  private readonly sentAt = signal(Date.now());
  private readonly now = signal(Date.now());
  protected readonly wait = computed(() =>
    Math.max(0, this.challenge().resend_in - Math.floor((this.now() - this.sentAt()) / 1000)),
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor() {
    // Nouveau défi (renvoi du code) : le compte à rebours repart
    effect(() => {
      this.challenge();
      this.sentAt.set(Date.now());
      this.now.set(Date.now());
      this.form.reset();
    });
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.verify.emit(this.form.getRawValue().code);
  }
}
