export interface Client {
  id: number;
  boutique_id: number;
  nom: string;
  telephone: string | null;
  whatsapp: string | null;
  photo_path: string | null;
  adresse: string | null;
  note: string | null;
  /** Champs calculés par l'API */
  total_du: number;
  nb_dettes_ouvertes: number;
  nb_dettes_en_retard: number;
}

export type ClientPayload = Pick<Client, 'nom' | 'telephone' | 'whatsapp' | 'adresse' | 'note'>;

export type ClientFiltre = 'avec_dette' | 'a_jour' | 'en_retard';
