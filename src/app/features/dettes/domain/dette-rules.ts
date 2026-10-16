import { DETTE_STATUTS_OUVERTS, DetteStatut } from '../../../core/domain/enums';
import { todayIso } from '../../../core/utils/dates';
import { Dette } from './dette.model';

/** Statut d'une dette non soldée d'après son échéance (Dette::statutSelonEcheance). */
export function statutSelonEcheance(dateEcheance: string | null, aujourdhui = todayIso()): DetteStatut {
  if (dateEcheance === null) return DetteStatut.EnAttente;
  const echeance = dateEcheance.slice(0, 10);
  if (echeance > aujourdhui) return DetteStatut.EnAttente;
  if (echeance === aujourdhui) return DetteStatut.AAujourdhui;
  return DetteStatut.EnRetard;
}

/**
 * Recalcule montant_paye, montant_restant et statut à partir des paiements
 * (Dette::recalculer). Une dette annulée garde son statut.
 */
export function recalculerDette(dette: Dette, totalPaye: number, aujourdhui = todayIso()): Dette {
  dette.montant_paye = Math.round(totalPaye);
  dette.montant_restant = Math.max(0, Math.round(dette.montant - totalPaye));
  if (dette.statut !== DetteStatut.Annulee) {
    dette.statut = dette.montant_restant <= 0 ? DetteStatut.Payee : statutSelonEcheance(dette.date_echeance, aujourdhui);
  }
  return dette;
}

export function estOuverte(dette: Pick<Dette, 'statut'>): boolean {
  return DETTE_STATUTS_OUVERTS.includes(dette.statut);
}

/** Ordre d'imputation d'un versement global : de la plus ancienne à la plus récente. */
export function trierPourImputation<T extends Pick<Dette, 'date_creation' | 'id'>>(dettes: T[]): T[] {
  return [...dettes].sort((a, b) => a.date_creation.localeCompare(b.date_creation) || a.id - b.id);
}

export interface LigneRepartition {
  dette: Dette;
  part: number;
  reste_apres: number;
}

/** Aperçu de la répartition d'un montant sur les dettes ouvertes d'un client. */
export function repartir(dettesOuvertes: Dette[], montant: number): LigneRepartition[] {
  let reste = Math.max(0, Math.round(montant));
  return trierPourImputation(dettesOuvertes.filter(estOuverte)).map((dette) => {
    const part = Math.min(reste, dette.montant_restant);
    reste -= part;
    return { dette, part, reste_apres: dette.montant_restant - part };
  });
}
