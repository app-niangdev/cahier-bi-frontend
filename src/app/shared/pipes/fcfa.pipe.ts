import { Pipe, PipeTransform } from '@angular/core';

const FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** Montant en francs CFA (XOF), sans décimales : 125000 → « 125 000 FCFA ». */
export function formatFcfa(value: number | null | undefined, suffix = true): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
  // Intl utilise une espace fine insécable : on la remplace par une espace insécable classique
  const formatted = FORMAT.format(n).replace(/[\u202f\u00a0\s]/g, '\u00a0');
  return suffix ? `${formatted}\u00a0FCFA` : formatted;
}

@Pipe({ name: 'fcfa' })
export class FcfaPipe implements PipeTransform {
  transform(value: number | null | undefined, suffix = true): string {
    return formatFcfa(value, suffix);
  }
}
