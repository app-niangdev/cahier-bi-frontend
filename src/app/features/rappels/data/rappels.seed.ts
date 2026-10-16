import { CanalRappel, StatutRappel, TonRappel } from '../../../core/domain/enums';
import { addDays, todayIso } from '../../../core/utils/dates';
import { SeededRandom } from '../../../core/utils/random';
import { Client } from '../../clients/domain/client.model';
import { Dette } from '../../dettes/domain/dette.model';
import { Rappel, genererMessageRappel } from '../domain/rappel.model';

const BOUTIQUES: Record<number, string> = {
  1: 'Boutique Diop Médina',
  2: 'Boutique Diop Thiès',
  3: 'Alimentation Ndiaye',
};

/** Historique simulé : quelques rappels sur des dettes de chaque boutique. */
export function seedRappels(dettes: Dette[], clients: Client[], today = todayIso()): Rappel[] {
  const rng = new SeededRandom(31);
  const cibles = dettes.filter((d) => d.statut !== 'annulee' && d.date_echeance !== null).slice(0, 60);
  const scenarios: { canal: CanalRappel; ton: TonRappel; statut: StatutRappel; erreur: string | null }[] = [
    { canal: 'whatsapp', ton: 'poli', statut: 'envoye', erreur: null },
    { canal: 'whatsapp', ton: 'normal', statut: 'envoye', erreur: null },
    { canal: 'sms', ton: 'ferme', statut: 'echoue', erreur: 'Numéro injoignable' },
    { canal: 'whatsapp', ton: 'ferme', statut: 'envoye', erreur: null },
    { canal: 'sms', ton: 'poli', statut: 'envoye', erreur: null },
    { canal: 'whatsapp', ton: 'normal', statut: 'en_attente', erreur: null },
    { canal: 'whatsapp', ton: 'poli', statut: 'echoue', erreur: "Ce numéro n'a pas de compte WhatsApp" },
    { canal: 'sms', ton: 'normal', statut: 'envoye', erreur: null },
    { canal: 'whatsapp', ton: 'poli', statut: 'envoye', erreur: null },
    { canal: 'whatsapp', ton: 'ferme', statut: 'envoye', erreur: null },
  ];

  return scenarios.map((scenario, index) => {
    const dette = cibles[(index * 7) % cibles.length];
    const client = clients.find((c) => c.id === dette.client_id);
    const jour = addDays(today, -rng.int(0, 25));
    const heure = `${String(rng.int(8, 19)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`;
    return {
      id: index + 1,
      dette_id: dette.id,
      boutique_id: dette.boutique_id,
      canal: scenario.canal,
      ton: scenario.ton,
      statut: scenario.statut,
      envoye_le: scenario.statut === 'en_attente' ? null : `${jour}T${heure}`,
      message: genererMessageRappel(scenario.ton, {
        client: client?.nom ?? 'Client',
        boutique: BOUTIQUES[dette.boutique_id] ?? 'la boutique',
        reference: dette.reference,
        montant_restant: `${new Intl.NumberFormat('fr-FR').format(dette.montant).replace(/\s/g, ' ')} FCFA`,
        echeance: dette.date_echeance,
      }),
      erreur: scenario.erreur,
      created_at: `${jour}T${heure}`,
    };
  });
}
