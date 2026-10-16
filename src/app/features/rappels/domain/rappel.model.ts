import { CanalRappel, StatutRappel, TonRappel } from '../../../core/domain/enums';

export interface Rappel {
  id: number;
  dette_id: number;
  boutique_id: number;
  canal: CanalRappel;
  ton: TonRappel;
  statut: StatutRappel;
  envoye_le: string | null;
  message: string;
  erreur: string | null;
  created_at: string;
}

export interface RappelPayload {
  dette_id: number;
  canal: CanalRappel;
  ton: TonRappel;
  message: string;
}

export interface MessageRappelContexte {
  client: string;
  boutique: string;
  reference: string;
  montant_restant: string;
  echeance: string | null;
}

/** Modèles de message par ton (aperçu avant envoi). */
export function genererMessageRappel(ton: TonRappel, ctx: MessageRappelContexte): string {
  const echeance = ctx.echeance ? ` (échéance du ${ctx.echeance})` : '';
  switch (ton) {
    case 'poli':
      return (
        `Bonjour ${ctx.client}, j'espère que vous allez bien. ` +
        `Petit rappel amical : il reste ${ctx.montant_restant} sur votre dette ${ctx.reference}${echeance} ` +
        `chez ${ctx.boutique}. Merci beaucoup et à bientôt !`
      );
    case 'ferme':
      return (
        `${ctx.client}, votre dette ${ctx.reference} chez ${ctx.boutique} n'est toujours pas réglée${echeance}. ` +
        `Montant restant : ${ctx.montant_restant}. Merci de régulariser sans délai.`
      );
    default:
      return (
        `Bonjour ${ctx.client}, nous vous rappelons qu'il reste ${ctx.montant_restant} à régler ` +
        `sur votre dette ${ctx.reference}${echeance} chez ${ctx.boutique}. Merci.`
      );
  }
}
