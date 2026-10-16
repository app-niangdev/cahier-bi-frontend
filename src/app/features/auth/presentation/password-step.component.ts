import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { PASSWORD_MIN_LENGTH, passwordsMatch } from '../../../shared/utils/validators';

/** Choix d'un mot de passe avec confirmation. */
@Component({
  selector: 'app-password-step',
  imports: [ReactiveFormsModule, AutofocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div>
        <label class="label" for="new-password">Nouveau mot de passe</label>
        <input id="new-password" type="password" class="input" formControlName="password" autocomplete="new-password" appAutofocus aria-describedby="new-password-err" />
        @if (form.controls.password.touched && form.controls.password.invalid) {
          <p id="new-password-err" class="field-error">Au moins {{ minLength }} caractères.</p>
        }
      </div>
      <div>
        <label class="label" for="confirmation">Confirmer le mot de passe</label>
        <input id="confirmation" type="password" class="input" formControlName="confirmation" autocomplete="new-password" aria-describedby="confirmation-err" />
        @if (form.controls.confirmation.touched && form.hasError('passwordsMismatch')) {
          <p id="confirmation-err" class="field-error">Les deux mots de passe ne correspondent pas.</p>
        }
      </div>
      <button type="submit" class="btn btn-primary w-full" [disabled]="pending()">{{ pending() ? 'Enregistrement…' : submitLabel() }}</button>
    </form>
  `,
})
export class PasswordStepComponent {
  readonly pending = input(false);
  readonly submitLabel = input('Enregistrer');
  readonly password = output<string>();

  protected readonly minLength = PASSWORD_MIN_LENGTH;
  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.password.emit(this.form.getRawValue().password);
  }
}
