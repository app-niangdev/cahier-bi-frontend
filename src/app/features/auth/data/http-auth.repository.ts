import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Role } from '../../../core/domain/enums';
import { User } from '../../../core/domain/user.model';
import { API_URL, ApiEnvelope, payload } from '../../../core/http/api';
import { nationalNumber, normalizeTelephone } from '../../../core/utils/telephone';
import { Tenant } from '../../tenants/domain/tenant.model';
import {
  AuthRepository,
  AuthSession,
  AuthStep,
  OtpChallenge,
  OtpPurpose,
  ProfilPayload,
  RegisterPayload,
} from '../domain/auth.repository';

/** Profil renvoyé par TokenService::profile(). */
interface ApiProfile {
  id: number;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  phone_two: string | null;
  address: string | null;
  role: Role;
  tenant_id: number | null;
  tenant: { name: string; short_name: string | null } | null;
  boutique: { id: number } | null;
  subscription: { state: 'active' | 'expiring' | 'expired' | 'none' } | null;
}

/** TokenService::issue() */
interface ApiTokens {
  step: 'authenticated';
  access_token: string;
  refresh_token: string;
  must_change_password: boolean;
  user: ApiProfile;
}

type ApiStep =
  | ApiTokens
  | ({ step: 'otp_required' } & OtpChallenge)
  | { step: 'set_password'; reset_token: string; purpose: OtpPurpose };

/** Implémentation HTTP de /api/auth/* (AuthController Laravel). */
@Injectable()
export class HttpAuthRepository implements AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL)}/auth`;

  loginWithPhone(telephone: string, password: string): Observable<AuthStep> {
    return this.step(this.http.post<ApiEnvelope<ApiStep>>(`${this.url}/login`, { phone: nationalNumber(telephone) ?? telephone, password }));
  }

  loginWithEmail(email: string, password: string): Observable<AuthStep> {
    return this.step(this.http.post<ApiEnvelope<ApiStep>>(`${this.url}/login`, { email: email.trim().toLowerCase(), password }));
  }

  me(): Observable<AuthSession> {
    return this.http.get<ApiEnvelope<ApiProfile>>(`${this.url}/me`).pipe(
      payload(),
      map((profile) => toSession(profile, null)),
    );
  }

  logout(): Observable<void> {
    return this.http.post<ApiEnvelope<null>>(`${this.url}/logout`, {}).pipe(map(() => undefined));
  }

  register(p: RegisterPayload): Observable<OtpChallenge> {
    return this.http
      .post<ApiEnvelope<OtpChallenge>>(`${this.url}/register`, {
        first_name: p.first_name,
        last_name: p.last_name,
        company_name: p.company_name,
        phone: nationalNumber(p.telephone) ?? p.telephone,
        password: p.password,
        password_confirmation: p.password,
      })
      .pipe(payload());
  }

  verifyOtp(challengeToken: string, code: string): Observable<AuthStep> {
    return this.step(this.http.post<ApiEnvelope<ApiStep>>(`${this.url}/otp/verify`, { challenge_token: challengeToken, code }));
  }

  resendOtp(challengeToken: string): Observable<OtpChallenge> {
    return this.http.post<ApiEnvelope<OtpChallenge>>(`${this.url}/otp/resend`, { challenge_token: challengeToken }).pipe(payload());
  }

  setPassword(resetToken: string, password: string): Observable<AuthSession> {
    return this.http
      .post<ApiEnvelope<ApiTokens>>(`${this.url}/password/set`, {
        reset_token: resetToken,
        password,
        password_confirmation: password,
      })
      .pipe(
        payload(),
        map((tokens) => toSession(tokens.user, tokens)),
      );
  }

  forgotPassword(telephone: string): Observable<OtpChallenge> {
    return this.http
      .post<ApiEnvelope<OtpChallenge>>(`${this.url}/forgot-password`, { phone: nationalNumber(telephone) ?? telephone })
      .pipe(payload());
  }

  forgotPasswordByEmail(email: string): Observable<void> {
    return this.http.post<ApiEnvelope<null>>(`${this.url}/forgot-password`, { email: email.trim().toLowerCase() }).pipe(map(() => undefined));
  }

  resetPasswordByEmail(email: string, code: string, password: string): Observable<void> {
    return this.http
      .post<ApiEnvelope<null>>(`${this.url}/reset-password`, {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        password,
        password_confirmation: password,
      })
      .pipe(map(() => undefined));
  }

  updateMe(p: ProfilPayload): Observable<User> {
    return this.http
      .put<ApiEnvelope<ApiProfile>>(`${this.url}/me`, {
        phone_two: p.phone_two ? (nationalNumber(p.phone_two) ?? p.phone_two) : null,
        address: p.address?.trim() || null,
      })
      .pipe(
        payload(),
        map((profile) => toUser(profile)),
      );
  }

  changePassword(current: string, password: string): Observable<User> {
    return this.http
      .put<ApiEnvelope<ApiProfile>>(`${this.url}/me`, {
        current_password: current,
        password,
        password_confirmation: password,
      })
      .pipe(
        payload(),
        map((profile) => toUser(profile)),
      );
  }

  replaceTemporaryPassword(password: string): Observable<void> {
    return this.http
      .post<ApiEnvelope<null>>(`${this.url}/change-password`, { password, password_confirmation: password })
      .pipe(map(() => undefined));
  }

  private step(source: Observable<ApiEnvelope<ApiStep>>): Observable<AuthStep> {
    return source.pipe(
      payload(),
      map((res): AuthStep => {
        switch (res.step) {
          case 'authenticated':
            return { step: 'authenticated', session: toSession(res.user, res) };
          case 'set_password':
            return { step: 'set_password', reset_token: res.reset_token, purpose: res.purpose };
          default:
            return {
              step: 'otp_required',
              challenge: {
                challenge_token: res.challenge_token,
                purpose: res.purpose,
                phone_masked: res.phone_masked,
                expires_in: res.expires_in,
                resend_in: res.resend_in,
                resends_left: res.resends_left,
              },
            };
        }
      }),
    );
  }
}

function toUser(p: ApiProfile): User {
  return {
    id: p.id,
    name: p.full_name,
    first_name: p.first_name,
    last_name: p.last_name,
    telephone: normalizeTelephone(p.phone) ?? p.phone ?? '',
    email: p.email,
    phone_two: normalizeTelephone(p.phone_two) ?? p.phone_two,
    address: p.address,
    role: p.role,
    tenant_id: p.tenant_id,
    boutique_id: p.boutique?.id ?? null,
    is_active: true,
  };
}

function toTenant(p: ApiProfile): Tenant | null {
  if (!p.tenant || p.tenant_id === null) return null;
  return {
    id: p.tenant_id,
    name: p.tenant.name,
    short_name: p.tenant.short_name,
    email: null,
    phone_call: null,
    phone_whatsapp: null,
    address: null,
    trade: null,
    ninea: null,
    rccm: null,
    state: true,
    created_at: '',
    deleted_at: null,
  };
}

/** `tokens` absent : session restaurée par /auth/me, les jetons mémorisés restent en place. */
function toSession(profile: ApiProfile, tokens: ApiTokens | null): AuthSession {
  const state = profile.subscription?.state;
  return {
    token: tokens?.access_token ?? '',
    refresh_token: tokens?.refresh_token ?? null,
    user: toUser(profile),
    tenant: toTenant(profile),
    abonnement_actif: !profile.subscription || state === 'active' || state === 'expiring',
    must_change_password: tokens?.must_change_password ?? false,
  };
}
