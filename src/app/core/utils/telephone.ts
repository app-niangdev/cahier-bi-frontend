import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Numéros sénégalais : stockés sous la forme canonique `+2217XXXXXXXX`,
 * affichés `+221 7X XXX XX XX`.
 */
const MOBILE_SN = /^7[05678]\d{7}$/;

/** Retourne le numéro national à 9 chiffres, ou null s'il est invalide. */
export function nationalNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00221')) digits = digits.slice(5);
  else if (digits.startsWith('221') && digits.length === 12) digits = digits.slice(3);
  return MOBILE_SN.test(digits) ? digits : null;
}

export function normalizeTelephone(value: string | null | undefined): string | null {
  const national = nationalNumber(value);
  return national ? `+221${national}` : null;
}

export function formatTelephone(value: string | null | undefined): string {
  if (!value) return '';
  const n = nationalNumber(value);
  if (!n) return value;
  return `+221 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 7)} ${n.slice(7, 9)}`;
}

/** Validateur : numéro mobile sénégalais (77, 78, 76, 75, 70). Vide accepté (combiner avec required). */
export const telephoneSnValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value as string | null;
  if (!value) return null;
  return nationalNumber(value) ? null : { telephone: true };
};
