import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../../../core/domain/user.model';
import { Tenant } from '../../tenants/domain/tenant.model';

export interface AuthSession {
  token: string;
  refresh_token: string | null;
  user: User;
  tenant: Tenant | null;
  /** false = abonnement expiré (middleware `subscription`) */
  abonnement_actif: boolean;
  /** Administrateur : mot de passe provisoire à remplacer (POST /auth/change-password). */
  must_change_password: boolean;
}

/** Inscription d'un propriétaire : le mot de passe est choisi avant la confirmation WhatsApp. */
export interface RegisterPayload {
  first_name: string;
  last_name: string;
  company_name: string;
  telephone: string;
  password: string;
}

/** Motif du code WhatsApp (OtpChallenge::purpose côté Laravel). */
export type OtpPurpose = 'signup' | 'first_login' | 'phone_verification' | 'password_reset';

/** Défi OTP envoyé sur WhatsApp (step = otp_required). */
export interface OtpChallenge {
  challenge_token: string;
  purpose: OtpPurpose;
  /** « 77 *** ** 67 » */
  phone_masked: string | null;
  expires_in: number;
  resend_in: number;
  resends_left: number;
}

/**
 * Réponse d'une étape d'authentification : session ouverte, code WhatsApp à saisir,
 * ou mot de passe à choisir (première connexion, mot de passe oublié).
 */
export type AuthStep =
  | { step: 'authenticated'; session: AuthSession }
  | { step: 'otp_required'; challenge: OtpChallenge }
  | { step: 'set_password'; reset_token: string; purpose: OtpPurpose };

export interface ProfilPayload {
  phone_two: string | null;
  address: string | null;
}

/** Équivalent de /auth/*. */
export interface AuthRepository {
  /** Propriétaire et gérant : numéro WhatsApp + mot de passe. */
  loginWithPhone(telephone: string, password: string): Observable<AuthStep>;
  /** Administrateur : e-mail + mot de passe. */
  loginWithEmail(email: string, password: string): Observable<AuthStep>;
  /** GET /auth/me avec le jeton mémorisé. */
  me(): Observable<AuthSession>;
  logout(): Observable<void>;
  register(payload: RegisterPayload): Observable<OtpChallenge>;
  verifyOtp(challengeToken: string, code: string): Observable<AuthStep>;
  resendOtp(challengeToken: string): Observable<OtpChallenge>;
  /** Après un code valide : nouveau mot de passe, puis connexion. */
  setPassword(resetToken: string, password: string): Observable<AuthSession>;
  /** Propriétaire et gérant : code sur WhatsApp. */
  forgotPassword(telephone: string): Observable<OtpChallenge>;
  /** Administrateur : code par e-mail. */
  forgotPasswordByEmail(email: string): Observable<void>;
  resetPasswordByEmail(email: string, code: string, password: string): Observable<void>;
  updateMe(payload: ProfilPayload): Observable<User>;
  changePassword(current: string, password: string): Observable<User>;
  /** Première connexion de l'administrateur (mot de passe provisoire). */
  replaceTemporaryPassword(password: string): Observable<void>;
}

export const AUTH_REPOSITORY = new InjectionToken<AuthRepository>('AUTH_REPOSITORY');
