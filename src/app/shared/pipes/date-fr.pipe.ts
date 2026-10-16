import { Pipe, PipeTransform } from '@angular/core';
import { parseDate } from '../../core/utils/dates';

const FORMATS: Record<'court' | 'long' | 'heure', Intl.DateTimeFormatOptions> = {
  court: { day: '2-digit', month: 'short', year: 'numeric' },
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  heure: { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
};

/** Dates en français : « 14 oct. 2026 ». Accepte 'YYYY-MM-DD' ou un ISO complet. */
@Pipe({ name: 'dateFr' })
export class DateFrPipe implements PipeTransform {
  transform(value: string | null | undefined, format: 'court' | 'long' | 'heure' = 'court'): string {
    if (!value) return '—';
    const date = format === 'heure' ? new Date(value) : parseDate(value);
    return new Intl.DateTimeFormat('fr-FR', FORMATS[format]).format(date);
  }
}
