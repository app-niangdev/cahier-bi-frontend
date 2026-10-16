import { DetteStatut } from '../../../core/domain/enums';
import { addDays, todayIso } from '../../../core/utils/dates';
import { SeededRandom } from '../../../core/utils/random';
import { Client } from '../../clients/domain/client.model';
import { Dette } from '../domain/dette.model';

const NOTES = ['Riz 25 kg + huile', 'Sucre et lait en poudre', 'Crédit téléphonique', 'Ciment 2 sacs', 'Achats de la semaine', 'Gaz butane 6 kg', null, null, null];

/**
 * ~80 dettes. Les montants payés et les statuts sont recalculés à partir des
 * paiements au chargement de la base (InMemoryDb), comme Dette::recalculer.
 */
export function seedDettes(clients: Client[], today = todayIso()): Dette[] {
  const rng = new SeededRandom(7);
  const brutes: Omit<Dette, 'id' | 'reference'>[] = [];

  clients.forEach((client, index) => {
    const nombre = rng.int(1, 4);
    for (let i = 0; i < nombre; i++) {
      const anciennete = rng.int(1, 150);
      const dateCreation = addDays(today, -anciennete);
      let dateEcheance: string | null = rng.chance(0.12) ? null : addDays(dateCreation, rng.int(7, 45));
      // Quelques échéances tombant aujourd'hui pour que ce statut soit représenté
      if ((index + i) % 9 === 0 && anciennete > 3) dateEcheance = today;

      brutes.push({
        boutique_id: client.boutique_id,
        client_id: client.id,
        montant: rng.int(5, 300) * 500,
        montant_paye: 0,
        montant_restant: 0,
        date_creation: dateCreation,
        date_echeance: dateEcheance,
        statut: DetteStatut.EnAttente,
        note: rng.pick(NOTES),
      });
    }
  });

  // Dettes annulées (erreur de saisie, marchandise rendue) : jamais de paiement
  for (const clientIndex of [1, 9, 14, 22, 27]) {
    const client = clients[clientIndex];
    const dateCreation = addDays(today, -rng.int(5, 60));
    brutes.push({
      boutique_id: client.boutique_id,
      client_id: client.id,
      montant: rng.int(4, 40) * 500,
      montant_paye: 0,
      montant_restant: 0,
      date_creation: dateCreation,
      date_echeance: addDays(dateCreation, 30),
      statut: DetteStatut.Annulee,
      note: 'Erreur de saisie',
    });
  }

  // Ids et références (D-0001, par boutique) dans l'ordre chronologique
  brutes.sort((a, b) => a.date_creation.localeCompare(b.date_creation));
  const compteurs = new Map<number, number>();
  return brutes.map((dette, index) => {
    const numero = (compteurs.get(dette.boutique_id) ?? 0) + 1;
    compteurs.set(dette.boutique_id, numero);
    return {
      ...dette,
      id: index + 1,
      reference: `D-${String(numero).padStart(4, '0')}`,
      montant_restant: dette.montant,
    };
  });
}
