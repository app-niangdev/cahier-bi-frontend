/** Compte d'un propriétaire (table `tenants`). Détient l'abonnement. */
export interface Tenant {
  id: number;
  name: string;
  short_name: string | null;
  email: string | null;
  phone_call: string | null;
  phone_whatsapp: string | null;
  address: string | null;
  trade: string | null;
  ninea: string | null;
  rccm: string | null;
  /** Compte actif (colonne `state`). */
  state: boolean;
  created_at: string;
  deleted_at: string | null;
}

export type TenantProfilPayload = Pick<
  Tenant,
  'name' | 'short_name' | 'email' | 'phone_call' | 'phone_whatsapp' | 'address' | 'trade' | 'ninea' | 'rccm'
>;
