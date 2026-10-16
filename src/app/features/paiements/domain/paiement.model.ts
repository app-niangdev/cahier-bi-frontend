import { DetteStatut, MethodePaiement } from '../../../core/domain/enums';

export interface Paiement {
  id: number;
  dette_id: number;
  boutique_id: number;
  client_id: number;
  enregistre_par: number | null;
  /** uuid commun à toutes les lignes d'un même versement */
  versement: string;
  montant: number;
  /** 'YYYY-MM-DD' */
  date_paiement: string;
  methode: MethodePaiement;
  reference: string | null;
  note: string | null;
}

export interface EncaissementPayload {
  montant: number;
  methode: MethodePaiement;
  date_paiement?: string | null;
  reference?: string | null;
  note?: string | null;
}

export interface LigneVersement {
  dette_id: number;
  reference: string;
  montant: number;
  montant_restant: number;
  statut: DetteStatut;
}

/** Réponse d'un encaissement (PaiementService::repartir). */
export interface VersementResultat {
  versement: string;
  montant: number;
  repartition: LigneVersement[];
  client: { id: number; nom: string; total_du: number };
}

/** Un versement = toutes les lignes `paiements` partageant le même uuid. */
export interface Versement {
  versement: string;
  boutique_id: number;
  client_id: number;
  client_nom: string;
  montant: number;
  date_paiement: string;
  methode: MethodePaiement;
  reference: string | null;
  note: string | null;
  enregistre_par: number | null;
  enregistre_par_nom: string | null;
  lignes: (Paiement & { dette_reference: string })[];
}
