import { ApiError } from '../../../core/data/api-error';
import { InMemoryDb } from '../../../core/data/in-memory-db';
import { User } from '../../../core/domain/user.model';
import { uuid } from '../../../core/utils/random';
import { Client } from '../../clients/domain/client.model';
import { Dette } from '../../dettes/domain/dette.model';
import { trierPourImputation } from '../../dettes/domain/dette-rules';
import { EncaissementPayload, VersementResultat } from '../domain/paiement.model';

/**
 * PaiementService::repartir : crée une ligne `paiements` par dette touchée,
 * toutes reliées par le même uuid `versement`, puis recalcule chaque dette.
 */
export function repartirVersement(
  db: InMemoryDb,
  client: Client,
  dettesOuvertes: Dette[],
  payload: EncaissementPayload,
  par: User,
): VersementResultat {
  const montant = Math.round(payload.montant);
  if (!(montant > 0)) {
    throw new ApiError('Le montant doit être supérieur à 0.', 'MONTANT_INVALIDE', 422);
  }
  const resteDu = dettesOuvertes.reduce((sum, d) => sum + d.montant_restant, 0);
  if (resteDu === 0) {
    throw new ApiError(`${client.nom} n'a aucune dette à régler.`, 'AUCUNE_DETTE', 422);
  }
  if (montant > resteDu) {
    throw new ApiError(
      `Le montant dépasse le reste dû (${new Intl.NumberFormat('fr-FR').format(resteDu).replace(/\s/g, ' ')} F).`,
      'MONTANT_SUPERIEUR_AU_RESTE',
      422,
      { reste_du: resteDu },
    );
  }

  const versement = uuid();
  const resultat: VersementResultat = {
    versement,
    montant,
    repartition: [],
    client: { id: client.id, nom: client.nom, total_du: 0 },
  };

  let aRepartir = montant;
  for (const dette of trierPourImputation(dettesOuvertes)) {
    if (aRepartir === 0) break;
    const part = Math.min(aRepartir, dette.montant_restant);
    if (part === 0) continue;
    db.paiements.push({
      id: db.nextId(db.paiements),
      dette_id: dette.id,
      boutique_id: dette.boutique_id,
      client_id: dette.client_id,
      enregistre_par: par.id,
      versement,
      montant: part,
      date_paiement: payload.date_paiement || db.today,
      methode: payload.methode,
      reference: payload.reference?.trim() || null,
      note: payload.note?.trim() || null,
    });
    db.recalculerDette(dette);
    aRepartir -= part;
    resultat.repartition.push({
      dette_id: dette.id,
      reference: dette.reference,
      montant: part,
      montant_restant: dette.montant_restant,
      statut: dette.statut,
    });
  }

  resultat.client.total_du = db.clientAvecTotaux(client).total_du;
  return resultat;
}
