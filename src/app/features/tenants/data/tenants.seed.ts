import { addDays, todayIso } from '../../../core/utils/dates';
import { Tenant } from '../domain/tenant.model';

export function seedTenants(today = todayIso()): Tenant[] {
  return [
    {
      id: 1,
      name: 'Diop Distribution',
      short_name: 'Diop Distri',
      email: 'contact@diopdistribution.sn',
      phone_call: '+221771234567',
      phone_whatsapp: '+221771234567',
      address: 'Rue 22 x Blaise Diagne, Médina, Dakar',
      trade: 'Alimentation générale',
      ninea: '005123456 2G3',
      rccm: 'SN-DKR-2023-B-12345',
      state: true,
      created_at: `${addDays(today, -240)}T09:12:00.000Z`,
      deleted_at: null,
    },
    {
      id: 2,
      name: 'Ndiaye Commerce',
      short_name: 'Ndiaye',
      email: 'aissatou.ndiaye@gmail.com',
      phone_call: '+221769876543',
      phone_whatsapp: '+221769876543',
      address: 'HLM Grand Yoff, Dakar',
      trade: 'Quincaillerie et alimentation',
      ninea: null,
      rccm: null,
      state: true,
      created_at: `${addDays(today, -75)}T15:40:00.000Z`,
      deleted_at: null,
    },
  ];
}
