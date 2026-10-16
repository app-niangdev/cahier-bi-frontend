import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { BoutiqueContextStore } from '../../../core/boutique/boutique-context.store';
import { DetteStatut } from '../../../core/domain/enums';
import { addDays, startOfMonthIso, todayIso } from '../../../core/utils/dates';
import { Loadable } from '../../../shared/utils/loadable';
import { Client } from '../../clients/domain/client.model';
import { CLIENT_REPOSITORY } from '../../clients/domain/client.repository';
import { Dette, DetteFiltres } from '../domain/dette.model';
import { DETTE_REPOSITORY } from '../domain/dette.repository';

export type Periode = '' | '7j' | '30j' | 'mois' | '90j' | 'perso';

/** Liste des dettes filtrée par statut, période et client (filtres envoyés à l'API). */
@Injectable()
export class DettesStore {
  private readonly repo = inject(DETTE_REPOSITORY);
  private readonly clientsRepo = inject(CLIENT_REPOSITORY);
  private readonly ctx = inject(BoutiqueContextStore);

  readonly dettes = new Loadable<Dette[]>();
  readonly clients = new Loadable<Client[]>();

  readonly statut = signal<DetteStatut | ''>('');
  readonly clientId = signal<number | null>(null);
  readonly periode = signal<Periode>('');
  readonly du = signal('');
  readonly au = signal('');
  readonly recherche = signal('');

  readonly filtres = computed<DetteFiltres>(() => {
    const today = todayIso();
    const bornes: Record<Exclude<Periode, ''>, [string | null, string | null]> = {
      '7j': [addDays(today, -6), today],
      '30j': [addDays(today, -29), today],
      mois: [startOfMonthIso(today), today],
      '90j': [addDays(today, -89), today],
      perso: [this.du() || null, this.au() || null],
    };
    const [du, au] = this.periode() ? bornes[this.periode() as Exclude<Periode, ''>] : [null, null];
    return { statut: this.statut() || null, client_id: this.clientId(), du, au };
  });

  readonly resultats = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    const liste = this.dettes.data() ?? [];
    if (!q) return liste;
    return liste.filter((d) => d.reference.toLowerCase().includes(q) || (d.client?.nom ?? '').toLowerCase().includes(q));
  });

  readonly totaux = computed(() => {
    const liste = this.resultats().filter((d) => d.statut !== 'annulee');
    return {
      montant: liste.reduce((s, d) => s + d.montant, 0),
      restant: liste.reduce((s, d) => s + d.montant_restant, 0),
    };
  });

  readonly filtresActifs = computed(() => !!(this.statut() || this.clientId() || this.periode() || this.recherche()));

  constructor() {
    effect(() => {
      const boutiqueId = this.ctx.currentId();
      const filtres = this.filtres();
      untracked(() => {
        if (!boutiqueId) return this.dettes.reset();
        this.dettes.load(() => this.repo.list(boutiqueId, filtres), { keepData: true });
      });
    });
    effect(() => {
      const boutiqueId = this.ctx.currentId();
      untracked(() => (boutiqueId ? this.clients.load(() => this.clientsRepo.list(boutiqueId)) : this.clients.reset()));
    });
  }

  recharger(): void {
    if (this.dettes.error()) this.dettes.reload();
    if (this.clients.error()) this.clients.reload();
  }

  reinitialiser(): void {
    this.statut.set('');
    this.clientId.set(null);
    this.periode.set('');
    this.du.set('');
    this.au.set('');
    this.recherche.set('');
  }
}
