import { BoutiqueStatut } from '../../../core/domain/enums';

export interface Boutique {
  id: number;
  tenant_id: number;
  nom: string;
  slug: string;
  telephone: string | null;
  whatsapp: string | null;
  adresse: string | null;
  quartier: string | null;
  ville: string | null;
  logo_path: string | null;
  statut: BoutiqueStatut;
  deleted_at: string | null;
}

export type BoutiquePayload = Pick<
  Boutique,
  'tenant_id' | 'nom' | 'telephone' | 'whatsapp' | 'adresse' | 'quartier' | 'ville' | 'statut'
>;
