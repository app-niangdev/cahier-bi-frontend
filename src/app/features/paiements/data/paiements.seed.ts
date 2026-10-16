import { DetteStatut, MethodePaiement } from '../../../core/domain/enums';
import { addDays, diffDays, todayIso } from '../../../core/utils/dates';
import { SeededRandom } from '../../../core/utils/random';
import { Dette } from '../../dettes/domain/dette.model';
import { trierPourImputation } from '../../dettes/domain/dette-rules';
import { Paiement } from '../domain/paiement.model';

/** Qui enregistre les paiements dans chaque boutique (propriétaire et gérants). */
const AGENTS: Record<number, number[]> = { 1: [2, 3, 4], 2: [2, 6], 3: [7, 8] };

const METHODES: MethodePaiement[] = ['especes', 'especes', 'especes', 'wave', 'wave', 'orange_money', 'free_money', 'autre'];

function seededUuid(rng: SeededRandom): string {
  const hex = (n: number) => Array.from({ length: n }, () => rng.int(0, 15).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${rng.pick(['8', '9', 'a', 'b'])}${hex(3)}-${hex(12)}`;
}

function arrondi(montant: number): number {
  return Math.max(500, Math.round(montant / 500) * 500);
}

/**
 * ~120 lignes de paiement : paiements sur une dette précise et versements
 * globaux répartis de la dette la plus ancienne à la plus récente.
 */
export function seedPaiements(dettes: Dette[], today = todayIso()): Paiement[] {
  const rng = new SeededRandom(99);
  const paiements: Paiement[] = [];
  const reste = new Map(dettes.map((d) => [d.id, d.statut === DetteStatut.Annulee ? 0 : d.montant]));

  const ajouter = (dette: Dette, montant: number, date: string, versement: string, methode: MethodePaiement, note: string | null) => {
    paiements.push({
      id: 0,
      dette_id: dette.id,
      boutique_id: dette.boutique_id,
      client_id: dette.client_id,
      enregistre_par: rng.pick(AGENTS[dette.boutique_id]),
      versement,
      montant,
      date_paiement: date,
      methode,
      reference: methode === 'wave' || methode === 'orange_money' ? `TX${rng.int(100000, 999999)}` : null,
      note,
    });
    reste.set(dette.id, (reste.get(dette.id) ?? 0) - montant);
  };

  // 1. Paiements dette par dette
  for (const dette of dettes) {
    if (dette.statut === DetteStatut.Annulee) continue;
    const age = diffDays(dette.date_creation, today);
    if (age < 2) continue;
    const profil = rng.next();
    if (profil > 0.68) continue; // jamais payée

    const nbPaiements = rng.int(1, 2);
    const cible = profil < 0.34 ? dette.montant : arrondi(dette.montant * (0.2 + rng.next() * 0.5));
    let dejaPaye = 0;
    for (let i = 0; i < nbPaiements; i++) {
      const derniere = i === nbPaiements - 1;
      const montant = derniere ? cible - dejaPaye : Math.min(arrondi(cible / nbPaiements), cible - dejaPaye);
      if (montant <= 0) break;
      const date = addDays(dette.date_creation, Math.min(age, Math.round(((i + 1) * age) / (nbPaiements + 1)) + 1));
      ajouter(dette, montant, date, seededUuid(rng), rng.pick(METHODES), null);
      dejaPaye += montant;
    }
  }

  // 2. Versements globaux : un montant couvre la plus ancienne dette ouverte puis entame la suivante
  const parClient = new Map<number, Dette[]>();
  for (const dette of dettes) {
    if ((reste.get(dette.id) ?? 0) <= 0) continue;
    parClient.set(dette.client_id, [...(parClient.get(dette.client_id) ?? []), dette]);
  }
  const candidats = [...parClient.values()].filter((liste) => liste.length >= 2);
  for (const ouvertes of candidats.slice(0, 16)) {
    const [premiere, seconde] = trierPourImputation(ouvertes);
    const resteSeconde = reste.get(seconde.id) ?? 0;
    const montantVersement = (reste.get(premiere.id) ?? 0) + Math.min(resteSeconde, arrondi(resteSeconde * (0.2 + rng.next() * 0.6)));
    const recul = Math.max(0, diffDays(seconde.date_creation, today) - 1);
    const date = addDays(today, -rng.int(0, Math.min(recul, 40)));
    const versement = seededUuid(rng);
    const methode = rng.pick(METHODES);

    let aRepartir = montantVersement;
    for (const dette of trierPourImputation(ouvertes)) {
      if (aRepartir <= 0) break;
      const part = Math.min(aRepartir, reste.get(dette.id) ?? 0);
      if (part <= 0) continue;
      ajouter(dette, part, date, versement, methode, 'Versement global');
      aRepartir -= part;
    }
  }

  return paiements
    .sort((a, b) => a.date_paiement.localeCompare(b.date_paiement))
    .map((p, index) => ({ ...p, id: index + 1 }));
}
