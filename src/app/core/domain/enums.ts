/**
 * Enums alignés sur app/Enums du backend Laravel (mêmes valeurs, au caractère près).
 * Chaque enum est un objet constant + un type union : utilisable dans le code
 * (`DetteStatut.Payee`) comme dans les templates (`'payee'`).
 */

export const Role = {
  Admin: 'ADMIN',
  Proprietaire: 'PROPRIETAIRE',
  Gerant: 'GERANT',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const BoutiqueStatut = {
  Actif: 'actif',
  Inactif: 'inactif',
  Suspendu: 'suspendu',
} as const;
export type BoutiqueStatut = (typeof BoutiqueStatut)[keyof typeof BoutiqueStatut];

export const DetteStatut = {
  EnAttente: 'en_attente',
  AAujourdhui: 'a_aujourdhui',
  EnRetard: 'en_retard',
  Payee: 'payee',
  Annulee: 'annulee',
} as const;
export type DetteStatut = (typeof DetteStatut)[keyof typeof DetteStatut];

/** Statuts d'une dette qui peut encore recevoir des paiements (StatutDette::ouverts()). */
export const DETTE_STATUTS_OUVERTS: readonly DetteStatut[] = [
  DetteStatut.EnAttente,
  DetteStatut.AAujourdhui,
  DetteStatut.EnRetard,
];

export const MethodePaiement = {
  Especes: 'especes',
  Wave: 'wave',
  OrangeMoney: 'orange_money',
  FreeMoney: 'free_money',
  Autre: 'autre',
} as const;
export type MethodePaiement = (typeof MethodePaiement)[keyof typeof MethodePaiement];

export const CanalRappel = {
  Whatsapp: 'whatsapp',
  Sms: 'sms',
} as const;
export type CanalRappel = (typeof CanalRappel)[keyof typeof CanalRappel];

export const TonRappel = {
  Poli: 'poli',
  Normal: 'normal',
  Ferme: 'ferme',
} as const;
export type TonRappel = (typeof TonRappel)[keyof typeof TonRappel];

export const StatutRappel = {
  EnAttente: 'en_attente',
  Envoye: 'envoye',
  Echoue: 'echoue',
} as const;
export type StatutRappel = (typeof StatutRappel)[keyof typeof StatutRappel];

// Libellés français affichés dans l'interface

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur',
  PROPRIETAIRE: 'Propriétaire',
  GERANT: 'Gérant',
};

export const BOUTIQUE_STATUT_LABELS: Record<BoutiqueStatut, string> = {
  actif: 'Active',
  inactif: 'Inactive',
  suspendu: 'Suspendue',
};

export const DETTE_STATUT_LABELS: Record<DetteStatut, string> = {
  en_attente: 'En attente',
  a_aujourdhui: "Échéance aujourd'hui",
  en_retard: 'En retard',
  payee: 'Payée',
  annulee: 'Annulée',
};

export const METHODE_PAIEMENT_LABELS: Record<MethodePaiement, string> = {
  especes: 'Espèces',
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  autre: 'Autre',
};

export const CANAL_RAPPEL_LABELS: Record<CanalRappel, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
};

export const TON_RAPPEL_LABELS: Record<TonRappel, string> = {
  poli: 'Poli',
  normal: 'Normal',
  ferme: 'Ferme',
};

export const STATUT_RAPPEL_LABELS: Record<StatutRappel, string> = {
  en_attente: 'En attente',
  envoye: 'Envoyé',
  echoue: 'Échoué',
};

/** Transforme une table de libellés en options de <select>. */
export function toOptions<K extends string>(labels: Record<K, string>): { value: K; label: string }[] {
  return (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
}
