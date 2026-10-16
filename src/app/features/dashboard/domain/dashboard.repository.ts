import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Versement } from '../../paiements/domain/paiement.model';

export interface TopDebiteur {
  client_id: number;
  nom: string;
  total_du: number;
  nb_dettes: number;
}

export interface PointMensuel {
  /** 'YYYY-MM' */
  mois: string;
  label: string;
  encaisse: number;
  credit: number;
}

/** GET /manager/dashboard */
export interface DashboardStats {
  total_du: number;
  encaisse_mois: number;
  nb_dettes_en_retard: number;
  montant_en_retard: number;
  nb_dettes_aujourdhui: number;
  montant_aujourdhui: number;
  nb_clients: number;
  top_debiteurs: TopDebiteur[];
  derniers_versements: Versement[];
  evolution: PointMensuel[];
}

export interface DashboardRepository {
  stats(boutiqueId: number): Observable<DashboardStats>;
}

export const DASHBOARD_REPOSITORY = new InjectionToken<DashboardRepository>('DASHBOARD_REPOSITORY');
