import { Boutique } from '../domain/boutique.model';

export function seedBoutiques(): Boutique[] {
  return [
    {
      id: 1,
      tenant_id: 1,
      nom: 'Boutique Diop Médina',
      slug: 'boutique-diop-medina',
      telephone: '+221771234567',
      whatsapp: '+221771234567',
      adresse: 'Rue 22 x Avenue Blaise Diagne',
      quartier: 'Médina',
      ville: 'Dakar',
      logo_path: null,
      statut: 'actif',
      deleted_at: null,
    },
    {
      id: 2,
      tenant_id: 1,
      nom: 'Boutique Diop Thiès',
      slug: 'boutique-diop-thies',
      telephone: '+221781234568',
      whatsapp: '+221781234568',
      adresse: 'Avenue Caen, près du marché central',
      quartier: 'Randoulène',
      ville: 'Thiès',
      logo_path: null,
      statut: 'actif',
      deleted_at: null,
    },
    {
      id: 3,
      tenant_id: 2,
      nom: 'Alimentation Ndiaye',
      slug: 'alimentation-ndiaye',
      telephone: '+221769876543',
      whatsapp: '+221769876543',
      adresse: 'HLM Grand Yoff, villa 214',
      quartier: 'Grand Yoff',
      ville: 'Dakar',
      logo_path: null,
      statut: 'actif',
      deleted_at: null,
    },
  ];
}
