import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiSimulator } from '../../../core/data/api-simulator';
import { InMemoryDb } from '../../../core/data/in-memory-db';
import { addMonths, startOfMonthIso } from '../../../core/utils/dates';
import { estOuverte } from '../../dettes/domain/dette-rules';
import { grouperVersements } from '../../paiements/data/versements';
import { DashboardRepository, DashboardStats, PointMensuel } from '../domain/dashboard.repository';

const MOIS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

@Injectable()
export class InMemoryDashboardRepository implements DashboardRepository {
  private readonly db = inject(InMemoryDb);
  private readonly api = inject(ApiSimulator);

  stats(boutiqueId: number): Observable<DashboardStats> {
    return this.api.request(() => {
      this.db.boutiqueAccessible(boutiqueId);
      const dettes = this.db.dettes.filter((d) => d.boutique_id === boutiqueId);
      const ouvertes = dettes.filter(estOuverte);
      const paiements = this.db.paiements.filter((p) => p.boutique_id === boutiqueId);
      const debutMois = startOfMonthIso(this.db.today);
      const retard = ouvertes.filter((d) => d.statut === 'en_retard');
      const aujourdhui = ouvertes.filter((d) => d.statut === 'a_aujourdhui');
      const clients = this.db.clients.filter((c) => c.boutique_id === boutiqueId).map((c) => this.db.clientAvecTotaux(c));

      const evolution: PointMensuel[] = [];
      for (let i = 5; i >= 0; i--) {
        const mois = addMonths(debutMois, -i).slice(0, 7);
        evolution.push({
          mois,
          label: MOIS[Number(mois.slice(5, 7)) - 1],
          encaisse: paiements.filter((p) => p.date_paiement.startsWith(mois)).reduce((s, p) => s + p.montant, 0),
          credit: dettes
            .filter((d) => d.statut !== 'annulee' && d.date_creation.startsWith(mois))
            .reduce((s, d) => s + d.montant, 0),
        });
      }

      return {
        total_du: ouvertes.reduce((s, d) => s + d.montant_restant, 0),
        encaisse_mois: paiements.filter((p) => p.date_paiement >= debutMois).reduce((s, p) => s + p.montant, 0),
        nb_dettes_en_retard: retard.length,
        montant_en_retard: retard.reduce((s, d) => s + d.montant_restant, 0),
        nb_dettes_aujourdhui: aujourdhui.length,
        montant_aujourdhui: aujourdhui.reduce((s, d) => s + d.montant_restant, 0),
        nb_clients: clients.length,
        top_debiteurs: clients
          .filter((c) => c.total_du > 0)
          .sort((a, b) => b.total_du - a.total_du)
          .slice(0, 5)
          .map((c) => ({ client_id: c.id, nom: c.nom, total_du: c.total_du, nb_dettes: c.nb_dettes_ouvertes })),
        derniers_versements: grouperVersements(this.db, paiements).slice(0, 6),
        evolution,
      };
    });
  }
}
