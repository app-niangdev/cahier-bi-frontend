import { Injectable, signal } from '@angular/core';

const ACCESS_KEY = 'cahier-bi.token';
const REFRESH_KEY = 'cahier-bi.refresh-token';

/**
 * Jetons JWT de la session (accès + rafraîchissement), renvoyés dans le corps
 * des réponses de /auth/*. Le jeton d'accès est ajouté par l'intercepteur HTTP.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private readonly _token = signal<string | null>(read(ACCESS_KEY));
  private readonly _refreshToken = signal<string | null>(read(REFRESH_KEY));
  readonly token = this._token.asReadonly();
  readonly refreshToken = this._refreshToken.asReadonly();

  set(token: string | null, refreshToken: string | null = null): void {
    this._token.set(token);
    this._refreshToken.set(token ? refreshToken : null);
    write(ACCESS_KEY, token);
    write(REFRESH_KEY, token ? refreshToken : null);
  }

  clear(): void {
    this.set(null);
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // stockage indisponible (navigation privée) : session non mémorisée
  }
}
