import { SeededRandom } from '../../../core/utils/random';
import { Client } from '../domain/client.model';

const NOMS: string[] = [
  'Moussa Ndiaye', 'Aminata Diallo', 'Abdoulaye Sow', 'Mariama Ba', 'Ousmane Diop',
  'Ndèye Fatou Sène', 'Mamadou Lamine Cissé', 'Khady Ndoye', 'Serigne Mbacké Thiam', 'Astou Gaye',
  'Babacar Faye', 'Coumba Sy', 'Pape Malick Diouf', 'Sokhna Mbaye', 'Lamine Kane',
  'Bineta Camara', 'Modou Seck', 'Yacine Fall', 'Cheikh Tidiane Ba', 'Adja Dieng',
  'Ibrahima Sarr', 'Rokhaya Niang', 'Alioune Badara Guèye', 'Seynabou Diagne', 'Mor Talla Ndao',
  'Fatou Bintou Kébé', 'Daouda Sy', 'Aïda Wade', 'El Hadji Touré', 'Marème Faye',
];

const ADRESSES: Record<number, string[]> = {
  1: ['Médina, Rue 11', 'Médina, Gueule Tapée', 'Fass, Rue 9', 'Colobane', 'Médina, Rue 6 x 15'],
  2: ['Randoulène Nord', 'Mbour 1', 'Cité Lamy', 'Grand Thiès', 'Nguinth'],
  3: ['HLM Grand Yoff', 'Grand Yoff, Arafat', 'Khar Yalla', 'Liberté 6', 'Dalifort'],
};

const NOTES = ['Client fidèle depuis 2022', 'Paie en fin de mois', 'Voisin de la boutique', 'Commerçant au marché', null];

export function genTelephone(rng: SeededRandom): string {
  const prefixe = rng.pick(['77', '78', '76', '70', '75']);
  return `+221${prefixe}${String(rng.int(1_000_000, 9_999_999))}`;
}

export function seedClients(): Client[] {
  const rng = new SeededRandom(2024);
  const repartition: [number, number][] = [
    [1, 12],
    [2, 10],
    [3, 8],
  ];
  const clients: Client[] = [];
  let id = 0;
  for (const [boutiqueId, nombre] of repartition) {
    for (let i = 0; i < nombre; i++) {
      const telephone = genTelephone(rng);
      clients.push({
        id: ++id,
        boutique_id: boutiqueId,
        nom: NOMS[id - 1],
        telephone,
        whatsapp: rng.chance(0.75) ? telephone : null,
        photo_path: null,
        adresse: rng.pick(ADRESSES[boutiqueId]),
        note: rng.pick(NOTES),
        total_du: 0,
        nb_dettes_ouvertes: 0,
        nb_dettes_en_retard: 0,
      });
    }
  }
  return clients;
}
