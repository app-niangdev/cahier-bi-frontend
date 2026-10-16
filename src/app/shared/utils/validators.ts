import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Groupe de formulaire : `password` et `confirmation` identiques. */
export const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value as string | undefined;
  const confirmation = group.get('confirmation')?.value as string | undefined;
  return password && confirmation && password !== confirmation ? { passwordsMismatch: true } : null;
};

/** Règle Laravel (RegisterRequest, SetPasswordRequest, UpdateProfileRequest). */
export const PASSWORD_MIN_LENGTH = 8;
