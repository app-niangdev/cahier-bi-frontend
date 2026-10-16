import { Role } from './enums';

/** Utilisateur connecté (profil renvoyé par /auth/me et /auth/login). */
export interface User {
  id: number;
  /** Nom complet (prénom + nom) */
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  /** Numéro WhatsApp, identifiant du propriétaire et du gérant (+2217XXXXXXXX). */
  telephone: string;
  /** Identifiant de connexion de l'administrateur. */
  email?: string | null;
  phone_two?: string | null;
  address?: string | null;
  role: Role;
  tenant_id: number | null;
  boutique_id: number | null;
  is_active: boolean;
}
