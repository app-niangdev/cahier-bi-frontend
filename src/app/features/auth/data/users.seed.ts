import { Role } from '../../../core/domain/enums';
import { User } from '../../../core/domain/user.model';

export interface SeedUser extends User {
  password: string;
}

export function seedUsers(): SeedUser[] {
  return [
    { id: 1, name: 'Admin Plateforme', telephone: '+221700000000', role: Role.Admin, tenant_id: null, boutique_id: null, is_active: true, password: 'admin123' },
    { id: 2, name: 'Mamadou Diop', telephone: '+221771234567', role: Role.Proprietaire, tenant_id: 1, boutique_id: null, is_active: true, password: 'proprio123' },
    { id: 3, name: 'Awa Sarr', telephone: '+221772223344', role: Role.Gerant, tenant_id: 1, boutique_id: 1, is_active: true, password: 'gerant123' },
    { id: 4, name: 'Fatou Mbaye', telephone: '+221763334455', role: Role.Gerant, tenant_id: 1, boutique_id: 1, is_active: true, password: 'gerant123' },
    { id: 5, name: 'Ibrahima Faye', telephone: '+221785556677', role: Role.Gerant, tenant_id: 1, boutique_id: 1, is_active: false, password: 'gerant123' },
    { id: 6, name: 'Cheikh Fall', telephone: '+221784445566', role: Role.Gerant, tenant_id: 1, boutique_id: 2, is_active: true, password: 'gerant123' },
    { id: 7, name: 'Aïssatou Ndiaye', telephone: '+221769876543', role: Role.Proprietaire, tenant_id: 2, boutique_id: null, is_active: true, password: 'expire123' },
    { id: 8, name: 'Ousmane Gueye', telephone: '+221775556677', role: Role.Gerant, tenant_id: 2, boutique_id: 3, is_active: true, password: 'gerant123' },
  ];
}
