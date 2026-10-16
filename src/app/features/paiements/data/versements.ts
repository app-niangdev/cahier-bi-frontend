import { InMemoryDb } from '../../../core/data/in-memory-db';
import { Paiement, Versement } from '../domain/paiement.model';

/** Regroupe les lignes `paiements` par uuid de versement, du plus récent au plus ancien. */
export function grouperVersements(db: InMemoryDb, paiements: Paiement[]): Versement[] {
  const groupes = new Map<string, Paiement[]>();
  for (const p of paiements) groupes.set(p.versement, [...(groupes.get(p.versement) ?? []), p]);

  return [...groupes.entries()]
    .map(([versement, lignes]) => {
      const premiere = lignes[0];
      const agent = db.users.find((u) => u.id === premiere.enregistre_par);
      return {
        versement,
        boutique_id: premiere.boutique_id,
        client_id: premiere.client_id,
        client_nom: db.clients.find((c) => c.id === premiere.client_id)?.nom ?? 'Client supprimé',
        montant: lignes.reduce((sum, l) => sum + l.montant, 0),
        date_paiement: premiere.date_paiement,
        methode: premiere.methode,
        reference: premiere.reference,
        note: premiere.note,
        enregistre_par: premiere.enregistre_par,
        enregistre_par_nom: agent?.name ?? null,
        lignes: lignes.map((l) => ({
          ...l,
          dette_reference: db.dettes.find((d) => d.id === l.dette_id)?.reference ?? '—',
        })),
      };
    })
    .sort((a, b) => b.date_paiement.localeCompare(a.date_paiement) || b.lignes[0].id - a.lignes[0].id);
}
