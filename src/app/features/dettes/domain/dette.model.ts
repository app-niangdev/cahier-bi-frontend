import { DetteStatut } from '../../../core/domain/enums';
import { Paiement } from '../../paiements/domain/paiement.model';

export interface ClientResume {
  id: number;
  nom: string;
  telephone: string | null;
  whatsapp: string | null;
}

export interface Dette {
  id: number;
  boutique_id: number;
  client_id: number;
  reference: string;
  montant: number;
  montant_paye: number;
  montant_restant: number;
  /** 'YYYY-MM-DD' */
  date_creation: string;
  /** 'YYYY-MM-DD', null = sans échéance */
  date_echeance: string | null;
  statut: DetteStatut;
  note: string | null;
  /** Relation chargée (whenLoaded) */
  client?: ClientResume;
}

export interface DetteDetail extends Dette {
  client: ClientResume;
  paiements: Paiement[];
}

export interface DetteCreatePayload {
  client_id: number;
  montant: number;
  date_creation: string | null;
  date_echeance: string | null;
  note: string | null;
}

/** Échéance et note : tous ; montant : propriétaire seulement. */
export interface DetteUpdatePayload {
  montant?: number;
  date_echeance: string | null;
  note: string | null;
}

export interface DetteFiltres {
  statut?: DetteStatut | null;
  client_id?: number | null;
  /** Période sur date_creation, bornes incluses 'YYYY-MM-DD' */
  du?: string | null;
  au?: string | null;
}
