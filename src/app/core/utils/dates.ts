/** Dates au format API : 'YYYY-MM-DD' (colonnes `date`) ou ISO complet (colonnes `timestamp`). */

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Date locale (minuit) à partir de 'YYYY-MM-DD' ou d'un ISO complet. */
export function parseDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = parseDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function addMonths(iso: string, months: number): string {
  const date = parseDate(iso);
  date.setMonth(date.getMonth() + months);
  return toIsoDate(date);
}

/** Nombre de jours entre deux dates (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);
}

export function startOfMonthIso(iso = todayIso()): string {
  return `${iso.slice(0, 7)}-01`;
}
